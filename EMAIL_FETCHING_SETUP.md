# Email Fetching Setup

Automatic email fetching system for riemer.fyi backoffice.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Cron Trigger (every 5 minutes)              │
│  OR Manual button click                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  POST /api/cron/fetch-     │
         │       emails               │
         │  (Node.js runtime)         │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  EmailManagementService    │
         │  - Connects to IMAP        │
         │  - Fetches unread emails   │
         │  - Saves to Supabase       │
         │  - Marks as read in IMAP   │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  Supabase (PostgreSQL)     │
         │  - emails table            │
         │  - email_attachments table │
         └───────────────────────────┘
```

## Components

### 1. API Route: `app/api/cron/fetch-emails/route.ts`
- **Runtime**: Node.js (required for IMAP library)
- **Authentication**: Bearer token (`CRON_SECRET`)
- **Method**: POST
- **Response**: JSON with success status and email count

### 2. tRPC Endpoint: `email.fetchUnread`
- Manual fetch endpoint for on-demand email fetching
- Uses same `EmailManagementService` under the hood
- Accessible from dashboard UI

### 3. Cloudflare Cron Function: `functions/scheduled/cron.ts`
- Triggered automatically by Cloudflare Pages cron schedule
- Calls the `/api/cron/fetch-emails` endpoint

## Environment Variables

### Required for Production (Cloudflare Pages)

Set these in **Cloudflare Pages Dashboard** → **Settings** → **Environment Variables**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# IMAP (Email Fetching)
IMAP_USER=riemer@riemer.fyi
IMAP_PASSWORD=your-imap-password
IMAP_HOST=Imap0001.neo.space
IMAP_PORT=993

# Cron Security
CRON_SECRET=generate-a-secure-random-string-at-least-32-chars

# AI/LLM (for invoice processing)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Local Development (`.env.local`)

For local development, Supabase runs locally:

```bash
# Local Supabase (via `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# IMAP (same as production)
IMAP_USER=riemer@riemer.fyi
IMAP_PASSWORD=your-password
IMAP_HOST=Imap0001.neo.space
IMAP_PORT=993

# Cron (local testing)
CRON_SECRET=dev-secret-change-in-production

# AI
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

## Setup Instructions

### Local Development

1. **Start Supabase**:
   ```bash
   cd frontend-next
   supabase start
   ```

2. **Copy environment variables**:
   ```bash
   # .env.local already has the right config
   ```

3. **Run Next.js**:
   ```bash
   npm run dev
   ```

4. **Test manual fetch**:
   - Open http://localhost:3000
   - Go to Emails page
   - Click "Fetch Emails" button
   - OR use tRPC directly: `trpc.email.fetchUnread.mutate()`

5. **Test cron endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/cron/fetch-emails \
     -H "Authorization: Bearer dev-secret-change-in-production"
   ```

### Production Deployment (Cloudflare Pages)

1. **Set up Supabase hosted instance**:
   - Go to https://supabase.com
   - Create new project
   - Run migrations: `supabase db push`
   - Copy API keys from project settings

2. **Deploy to Cloudflare Pages**:
   ```bash
   npm run deploy:cloudflare
   ```

3. **Set environment variables** in Cloudflare Pages dashboard

4. **Set up Cron Trigger** in Cloudflare Pages:
   - Go to **Pages project** → **Settings** → **Functions** → **Cron Triggers**
   - Add trigger:
     - **Cron expression**: `*/5 * * * *` (every 5 minutes)
     - **Function route**: `/functions/scheduled/cron`
   - Save

5. **Verify**:
   - Wait 5 minutes or trigger manually
   - Check Cloudflare Pages logs
   - Check Supabase database for new emails

## Manual Testing

### Test the API endpoint directly:

```bash
# Production
curl -X POST https://your-app.pages.dev/api/cron/fetch-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Local
curl -X POST http://localhost:3000/api/cron/fetch-emails \
  -H "Authorization: Bearer dev-secret-change-in-production"
```

### Expected response:

```json
{
  "success": true,
  "count": 5,
  "timestamp": "2026-04-16T10:30:00.000Z"
}
```

## Alternative: External Cron Service

If Cloudflare Pages cron triggers don't work, use an external service:

### Option 1: GitHub Actions

Create `.github/workflows/fetch-emails.yml`:

```yaml
name: Fetch Emails
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  fetch-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger email fetch
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/fetch-emails \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 2: cron-job.org

1. Go to https://cron-job.org
2. Create free account
3. Add new cron job:
   - **URL**: `https://your-app.pages.dev/api/cron/fetch-emails`
   - **Schedule**: Every 5 minutes
   - **Request method**: POST
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

## Monitoring

### Cloudflare Pages Logs

```bash
# View logs
wrangler pages deployment tail

# View specific deployment
wrangler pages deployment tail --project-name=riemerfyi-backoffice
```

### Check Database

```sql
-- Check recent emails
SELECT id, subject, from_address, email_date, created_at
FROM emails
ORDER BY created_at DESC
LIMIT 10;

-- Check email stats
SELECT
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE is_read = false) as unread,
  COUNT(*) FILTER (WHERE has_attachments = true) as with_attachments
FROM emails;
```

## Troubleshooting

### "Missing authorization"
- Make sure `CRON_SECRET` is set in environment variables
- Check Authorization header format: `Bearer YOUR_SECRET`

### "Supabase configuration missing"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check they're not empty strings

### "IMAP connection failed"
- Verify IMAP credentials (`IMAP_USER`, `IMAP_PASSWORD`)
- Check IMAP host and port are correct
- Ensure IMAP server allows connections from Cloudflare IPs

### "No emails fetched"
- Check if there are actually unread emails in inbox
- Verify IMAP folder is correct (default: INBOX)
- Check email service logs for errors

### Cron not triggering
- Verify cron trigger is set up in Cloudflare Pages dashboard
- Check Cloudflare Pages logs for cron execution
- Try manual trigger first to verify endpoint works
- Consider using external cron service as backup

## Security Notes

1. **Never commit `.env.local`** - it's in `.gitignore`
2. **Use strong `CRON_SECRET`** - at least 32 random characters
3. **Rotate secrets regularly** - especially IMAP password
4. **Use Supabase RLS** - restrict access to emails table
5. **Monitor logs** - watch for suspicious activity

## Future Improvements

- [ ] Add Supabase RLS policies for email access
- [ ] Implement retry logic for failed email fetches
- [ ] Add email deduplication based on Message-ID
- [ ] Create admin dashboard for monitoring email fetching
- [ ] Add webhook for real-time email notifications
- [ ] Implement email archiving/cleanup cron job
