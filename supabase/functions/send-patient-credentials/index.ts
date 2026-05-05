// Supabase Edge Function — send-patient-credentials
// Creates a patient account using Supabase Admin API and sends an SMS via Twilio
// Deploy: npx supabase functions deploy send-patient-credentials

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const phoneToEmail = (phone: string) => `${phone.replace(/\D/g, '')}@patient.smartdental.com`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, name, clinicName } = await req.json();

    if (!phone || !name) {
      return new Response(
        JSON.stringify({ error: 'phone and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
    const messageServiceSid = Deno.env.get('TWILIO_MESSAGE_SERVICE_SID');
    
    // Supabase Admin credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_INTERNAL_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
       return new Response(
        JSON.stringify({ error: 'Supabase env vars not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Generate a random 6-digit password
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    const email = phoneToEmail(phone);

    let userId = null;

    // 2. Create the user using Admin API
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'patient',
        phone: phone
      }
    });

    if (createUserError) {
      // If user already exists, we might just want to inform them or skip
      if (createUserError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'patient_exists', message: 'هذا المراجع لديه حساب بالفعل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw createUserError;
    }

    userId = userData.user.id;

    // 3. Send SMS using Twilio (if configured, otherwise skip or return mock success for dev)
    let smsStatus = 'skipped';
    
    if (accountSid && authToken && messageServiceSid) {
      const message = 
        `مرحباً ${name}، تم فتح ملف لك في عيادة ${clinicName || 'الأسنان'}.\n` +
        `يمكنك متابعة مواعيدك عبر منصة سمارت دنتال 🦷\n\n` +
        `رقم الهاتف: ${phone}\n` +
        `كلمة المرور: ${password}\n\n` +
        `رابط المنصة: https://smart-dental.com/patient-login`;

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To:   phone,
            MessagingServiceSid: messageServiceSid,
            Body: message,
          }).toString(),
        }
      );

      if (!twilioResponse.ok) {
        const errorData = await twilioResponse.json();
        console.error('Twilio error:', errorData);
        // We still return success since the user was created, but with a warning
        smsStatus = 'failed';
      } else {
        smsStatus = 'sent';
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId, password, smsStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
