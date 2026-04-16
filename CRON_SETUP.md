# Email Fetching Cron Setup

## How It Works

Your email fetching runs automatically every 5 minutes using **Supabase pg_cron**.

```
┌──────────────────────┐
│ Supabase pg_cron     │
│ (every 5 minutes)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ POST /api/cron/fetch-emails      │
│ Authorization: Bearer SECRET     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ EmailManagementService           │
│ - Connect to IMAP                │
│ - Fetch unread emails            │
│ - Save to Supabase               │
│ - Mark as read                   │
└──────────────────────────────────┘
```

## Setup Steps

### 1. Apply Migration

The cron job is created automatically when you apply the migration:

```bash
cd /home/thartist/Desktop/riemerFYI/frontend-next

# Apply migration
supabase db push

# Or manually in Supabase SQL Editor:
# Copy contents of supabase/migrations/20260416_setup_email_cron.sql
```

### 2. Set CRON_SECRET in Supabase

After migration, set your cron secret in the database:

```sql
-- In Supabase SQL Editor
ALTER DATABASE postgres
SET app.cron_secret = 'your-actual-cron-secret-from-env';
```

Replace `'your-actual-cron-secret-from-env'` with the value from your `.env.local`.

### 3. Update URL in Cron Job

After deploying to Cloudflare Pages, update the URL:

```sql
-- In Supabase SQL Editor
-- First, unschedule the old job
SELECT cron.unschedule('fetch-emails-every-5-minutes');

-- Then create new job with production URL
SELECT cron.schedule(
  'fetch-emails-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR-ACTUAL-APP.pages.dev/api/cron/fetch-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

## Verify It's Working

### Check Scheduled Jobs

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Should show:
-- jobid | schedule      | command | ...
-- 1     | */5 * * * *  | SELECT net.http_post...
```

### Check Job Run History

```sql
-- View recent runs
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Check Emails Table

```sql
-- See recently fetched emails
SELECT id, subject, from_address, created_at
FROM backoffice_emails
ORDER BY created_at DESC
LIMIT 10;
```

## Manual Testing

You can also trigger email fetch manually:

### Via tRPC (in your app):

```typescript
// In your React component
const fetchEmails = trpc.email.fetchUnread.useMutation();

// Call it
fetchEmails.mutate();
```

### Via API directly:

```bash
curl -X POST https://your-app.pages.dev/api/cron/fetch-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Troubleshooting

### Cron job not running

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job;

-- Check for errors in job runs
SELECT * FROM cron.job_run_details
WHERE status != 'succeeded'
ORDER BY start_time DESC;
```

### "app.cron_secret not set" error

```sql
-- Set the secret
ALTER DATABASE postgres SET app.cron_secret = 'your-secret';

-- Verify it's set
SELECT current_setting('app.cron_secret', true);
```

### "Connection failed" in job runs

- Check your Cloudflare Pages URL is correct
- Verify app is deployed and running
- Check `CRON_SECRET` matches in both Supabase and app env vars

### No emails being fetched

- Check IMAP credentials in Cloudflare Pages env vars
- Verify emails exist in inbox
- Check Cloudflare Pages function logs

## Monitoring

### View Logs in Supabase

Dashboard → Database → Logs → Look for pg_cron activity

### View Logs in Cloudflare

Dashboard → Pages → Your Project → Functions → Logs

Filter for `/api/cron/fetch-emails` requests

## Modify Schedule

To change from every 5 minutes to a different schedule:

```sql
-- Unschedule
SELECT cron.unschedule('fetch-emails-every-5-minutes');

-- Reschedule with new timing (e.g., every 10 minutes)
SELECT cron.schedule(
  'fetch-emails-every-10-minutes',
  '*/10 * * * *',  -- Every 10 minutes
  $$ ... your SQL here ... $$
);
```

### Common Cron Schedules

```
*/5 * * * *   # Every 5 minutes
*/10 * * * *  # Every 10 minutes
*/15 * * * *  # Every 15 minutes
0 * * * *     # Every hour (on the hour)
0 */2 * * *   # Every 2 hours
0 9-17 * * *  # Every hour from 9am to 5pm
```

## Disable/Enable

### Temporarily disable

```sql
SELECT cron.unschedule('fetch-emails-every-5-minutes');
```

### Re-enable

```sql
-- Run the schedule command again (see Setup Steps above)
```

## Cost Considerations

- **Supabase pg_cron**: Free on all plans
- **IMAP connections**: 288 connections/day (every 5 min × 24 hours)
- **API calls**: 288 requests/day to your Cloudflare Pages app
- **Anthropic API**: Only charged if email processing uses LLM

All within free tiers for normal usage! 🎉
