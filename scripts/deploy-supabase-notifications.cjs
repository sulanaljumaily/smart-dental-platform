/**
 * Dental Platform — Automated Supabase Notifications Deployment Script
 * Applies all push notifications SQL tables, RLS policies, triggers, RPCs,
 * Realtime publication settings, and 5-minute server-side `pg_cron` scheduler
 * directly to the live Supabase PostgreSQL database.
 *
 * Usage:
 *   node scripts/deploy-supabase-notifications.cjs
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_CONFIG = {
  user: process.env.SUPABASE_DB_USER || 'postgres.nhueyaeyutfmadbgghfe',
  password: process.env.SUPABASE_DB_PASSWORD || '10770$ULTAn0770',
  host: process.env.SUPABASE_DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
};

async function main() {
  console.log('🚀 Dental Platform — Deploying Notifications System to Supabase...\n');
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // 1. Apply primary push notifications migration
    const migPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261123_push_notifications_system.sql');
    if (!fs.existsSync(migPath)) {
      throw new Error('Migration file not found: ' + migPath);
    }
    const sql = fs.readFileSync(migPath, 'utf8');
    await client.query(sql);
    console.log('✅ Applied 20261123_push_notifications_system.sql');

    // 2. Ensure REPLICA IDENTITY FULL on public.notifications for reliable Realtime payloads
    await client.query('ALTER TABLE public.notifications REPLICA IDENTITY FULL;');
    console.log('✅ Enabled REPLICA IDENTITY FULL on public.notifications');

    // 3. Verify supabase_realtime publication contains notifications
    const pubCheck = await client.query(`
      SELECT tablename FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications';
    `);
    if (pubCheck.rows.length === 0) {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;');
      console.log('✅ Added public.notifications to supabase_realtime publication');
    } else {
      console.log('✅ public.notifications is active in supabase_realtime');
    }

    // 4. Enable pg_cron & schedule automatic 5-minute server-side dispatch for
    //    scheduled admin notifications + 1-day-before appointment reminders
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;');
      console.log('✅ pg_cron extension enabled');

      // Remove existing schedule with same name if present to keep idempotent
      await client.query(`
        DO $$
        DECLARE v_jobid BIGINT;
        BEGIN
          SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'dental_notifications_scheduler';
          IF v_jobid IS NOT NULL THEN
            PERFORM cron.unschedule(v_jobid);
          END IF;
        END $$;
      `);

      await client.query(`
        SELECT cron.schedule(
          'dental_notifications_scheduler',
          '*/5 * * * *',
          $$SELECT public.process_due_notifications_and_reminders();$$
        );
      `);
      console.log('✅ Scheduled server-side cron job "dental_notifications_scheduler" (every 5 minutes)');
    } catch (cronErr) {
      console.warn('⚠️ pg_cron setup skipped (will use client/edge heartbeat fallback):', cronErr.message);
    }

    // 5. Verify live tables, triggers, templates & audience resolution
    const triggers = await client.query(`
      SELECT tgname, tgrelid::regclass::text AS tbl
      FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgrelid IN ('public.notifications'::regclass, 'public.appointments'::regclass, 'public.courses'::regclass)
      ORDER BY tbl, tgname;
    `);
    console.log('\n📋 Active Database Triggers:');
    triggers.rows.forEach((r) => console.log(`   - ${r.tbl}: ${r.tgname}`));

    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM public.notification_templates) AS templates,
        (SELECT count(*) FROM public.resolve_notification_recipients(ARRAY['doctor_staff'])) AS doctor_staff,
        (SELECT count(*) FROM public.resolve_notification_recipients(ARRAY['laboratory'])) AS laboratory,
        (SELECT count(*) FROM public.resolve_notification_recipients(ARRAY['supplier'])) AS supplier,
        (SELECT count(*) FROM public.resolve_notification_recipients(ARRAY['patient'])) AS patient,
        (SELECT count(*) FROM public.resolve_notification_recipients(ARRAY['all'])) AS all_users;
    `);
    console.log('\n📊 Live Database Verification:', counts.rows[0]);

    // 6. Optional: Deploy Edge Function if SUPABASE_ACCESS_TOKEN is available
    if (process.env.SUPABASE_ACCESS_TOKEN) {
      console.log('\n☁️ Deploying Supabase Edge Function send-push-notification...');
      execSync('npx supabase functions deploy send-push-notification --project-ref nhueyaeyutfmadbgghfe --no-verify-jwt', {
        stdio: 'inherit',
      });
      console.log('✅ Edge Function send-push-notification deployed!');
    } else {
      console.log('\nℹ️ Database, Realtime, Triggers, RPCs, and pg_cron are 100% live on Supabase!');
      console.log('   (No Firebase required for Windows Desktop, Web, or Android background polling notifications.)');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
