/**
 * Dental Platform — Push Notifications Edge Function (FCM HTTP v1 API)
 * Based on https://supabase.com/docs/guides/functions/examples/push-notifications
 *
 * Supports 3 invocation modes:
 * 1. Supabase Database Webhook on INSERT into `public.notifications`:
 *    { type: "INSERT", table: "notifications", record: { id, user_id, title, message, type, link, image_url, metadata } }
 * 2. Direct invoke from Admin Dashboard / App:
 *    { notification_ids?: string[], user_ids?: string[], title?, body?, link?, image_url?, data? }
 * 3. Scheduled Cron trigger (dispatches due scheduled campaigns + 1-day-before appointment reminders and pushes them):
 *    { action: "process_scheduled" }
 *
 * Required Supabase Secret:
 *   supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FirebaseServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type?: string;
  link?: string | null;
  image_url?: string | null;
  priority?: string | null;
  metadata?: Record<string, unknown> | null;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFirebaseAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResp = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Firebase OAuth token exchange failed (${tokenResp.status}): ${errText}`);
  }

  const tokenJson = await tokenResp.json();
  return tokenJson.access_token;
}

async function sendFcmV1Message(
  projectId: string,
  accessToken: string,
  token: string,
  notif: { title: string; body: string; link?: string | null; imageUrl?: string | null; type?: string; id?: string }
): Promise<{ ok: boolean; invalidToken?: boolean; error?: string }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const clickLink = notif.link || '/doctor/notifications';

  const messagePayload: Record<string, unknown> = {
    token,
    notification: {
      title: notif.title || 'منصة طب الأسنان',
      body: notif.body || '',
      ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
    },
    data: {
      notification_id: String(notif.id || ''),
      type: String(notif.type || 'system'),
      link: String(clickLink),
      title: String(notif.title || ''),
      body: String(notif.body || ''),
    },
    android: {
      priority: 'HIGH',
      notification: {
        channel_id: 'dental_platform_default',
        sound: 'default',
        default_vibrate_timings: true,
        click_action: 'FCM_PLUGIN_ACTIVITY',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title: notif.title || 'منصة طب الأسنان',
            body: notif.body || '',
          },
          sound: 'default',
          badge: 1,
        },
      },
    },
    webpush: {
      notification: {
        title: notif.title || 'منصة طب الأسنان',
        body: notif.body || '',
        icon: 'https://dental-platform.com/icons/icon-192x192.png',
        badge: 'https://dental-platform.com/icons/icon-96x96.png',
        dir: 'rtl',
        lang: 'ar',
        ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
      },
      fcm_options: {
        link: clickLink.startsWith('http') ? clickLink : `https://dental-platform.com${clickLink}`,
      },
    },
  };

  const res = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message: messagePayload }),
  });

  if (res.ok) return { ok: true };

  const errText = await res.text();
  const isUnregistered =
    res.status === 404 ||
    errText.includes('UNREGISTERED') ||
    errText.includes('registration-token-not-registered') ||
    errText.includes('INVALID_ARGUMENT');

  return { ok: false, invalidToken: isUnregistered, error: errText };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseSaRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));

    const recordsToPush: NotificationRecord[] = [];

    // Mode 3: Cron / Scheduled dispatcher (campaigns + 1-day-before appointment reminders)
    if (body?.action === 'process_scheduled') {
      const { data: procResult, error: procErr } = await supabase.rpc('process_due_notifications_and_reminders');
      if (procErr) throw procErr;

      const scheduledIds: string[] = procResult?.scheduled?.notification_ids || [];
      const reminderIds: string[] = procResult?.reminders?.notification_ids || [];
      const allIds = [...scheduledIds, ...reminderIds].filter(Boolean);

      if (allIds.length > 0) {
        const { data: rows } = await supabase
          .from('notifications')
          .select('id, user_id, title, message, type, link, image_url, priority, metadata')
          .in('id', allIds);
        if (rows) recordsToPush.push(...(rows as NotificationRecord[]));
      }

      if (recordsToPush.length === 0) {
        return new Response(
          JSON.stringify({ ok: true, mode: 'process_scheduled', pushed: 0, procResult }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // Mode 1: Database Webhook on INSERT into `notifications`
    else if (body?.type === 'INSERT' && body?.record?.user_id) {
      recordsToPush.push(body.record as NotificationRecord);
    }
    // Mode 2a: Direct notification IDs list
    else if (Array.isArray(body?.notification_ids) && body.notification_ids.length > 0) {
      const { data: rows } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, link, image_url, priority, metadata')
        .in('id', body.notification_ids.slice(0, 500));
      if (rows) recordsToPush.push(...(rows as NotificationRecord[]));
    }
    // Mode 2b: Direct ad-hoc payload with user_ids
    else if (Array.isArray(body?.user_ids) && body.user_ids.length > 0 && body?.title) {
      for (const uid of body.user_ids.slice(0, 500)) {
        recordsToPush.push({
          id: body.id || crypto.randomUUID(),
          user_id: uid,
          title: body.title,
          message: body.body || body.message || '',
          type: body.notification_type || 'system',
          link: body.link || null,
          image_url: body.image_url || null,
        });
      }
    }

    if (recordsToPush.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, pushed: 0, message: 'No notifications to dispatch' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If Firebase Service Account secret isn't configured yet, return graceful status
    // (In-app & Realtime Desktop/Web OS notifications still work automatically via Supabase Realtime!)
    if (!firebaseSaRaw) {
      return new Response(
        JSON.stringify({
          ok: true,
          fcm_configured: false,
          queued_records: recordsToPush.length,
          message:
            'FIREBASE_SERVICE_ACCOUNT secret not configured yet. Notifications are saved in DB and delivered via Realtime.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount: FirebaseServiceAccount = JSON.parse(firebaseSaRaw);
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Fetch all active FCM tokens for target users in a single batch query
    const uniqueUserIds = Array.from(new Set(recordsToPush.map((r) => r.user_id).filter(Boolean)));
    const { data: tokenRows, error: tokenErr } = await supabase
      .from('user_push_tokens')
      .select('id, user_id, token, platform')
      .in('user_id', uniqueUserIds)
      .eq('is_active', true);

    if (tokenErr) throw tokenErr;

    const tokensByUser = new Map<string, Array<{ id: string; token: string; platform: string }>>();
    for (const row of tokenRows || []) {
      const list = tokensByUser.get(row.user_id) || [];
      list.push(row);
      tokensByUser.set(row.user_id, list);
    }

    let sentCount = 0;
    let failedCount = 0;
    const staleTokenIds: string[] = [];

    for (const rec of recordsToPush) {
      const userTokens = tokensByUser.get(rec.user_id) || [];
      for (const tk of userTokens) {
        const result = await sendFcmV1Message(serviceAccount.project_id, accessToken, tk.token, {
          id: rec.id,
          title: rec.title,
          body: rec.message || '',
          link: rec.link,
          imageUrl: rec.image_url,
          type: rec.type,
        });

        if (result.ok) {
          sentCount++;
        } else {
          failedCount++;
          if (result.invalidToken) {
            staleTokenIds.push(tk.id);
          }
        }
      }
    }

    // Deactivate expired/uninstalled device tokens
    if (staleTokenIds.length > 0) {
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', staleTokenIds);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fcm_configured: true,
        records: recordsToPush.length,
        sent: sentCount,
        failed: failedCount,
        deactivated_tokens: staleTokenIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push-notification] Error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
