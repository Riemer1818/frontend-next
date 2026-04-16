-- ============================================
-- SUPABASE PG_CRON SETUP
-- Automatic email fetching every 5 minutes
-- ============================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule email fetching job
-- Runs every 5 minutes and calls our Next.js API endpoint
SELECT cron.schedule(
  'fetch-emails-every-5-minutes',  -- Job name
  '*/5 * * * *',                    -- Cron schedule (every 5 minutes)
  $$
  SELECT
    net.http_post(
      url := 'https://riemerfyi-backoffice.pages.dev/api/cron/fetch-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Set the CRON_SECRET as a database setting
-- You'll need to update this with your actual secret after deployment
-- ALTER DATABASE postgres SET app.cron_secret = 'your-actual-cron-secret-here';

-- View all scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('fetch-emails-every-5-minutes');

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL - used for automatic email fetching';
