import { NextRequest, NextResponse } from 'next/server';
import { EmailManagementService } from '@/server/services/EmailManagementService';
import { supabase } from '@/lib/supabase';

// IMAP library requires Node.js runtime (not edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Email fetching endpoint
 * Called by:
 * 1. Cloudflare Cron Trigger (automatic every 5 minutes)
 * 2. Manual fetch button (on-demand)
 * 3. External cron service (cron-job.org, GitHub Actions, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || !cronSecret) {
      return NextResponse.json(
        { error: 'Missing authorization configuration' },
        { status: 500 }
      );
    }

    const providedSecret = authHeader.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create email service with Supabase client
    const emailService = new EmailManagementService(supabase, {
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASSWORD || '',
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
    });

    console.log('📧 [CRON] Starting email fetch...');
    const savedEmails = await emailService.fetchAndSaveUnreadEmails();

    console.log(`✅ [CRON] Saved ${savedEmails.length} emails`);

    return NextResponse.json({
      success: true,
      count: savedEmails.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [CRON] Email fetch failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Email fetch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 * Returns status without fetching
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/cron/fetch-emails',
    method: 'POST',
    auth: 'Bearer token required in Authorization header',
    runtime: 'nodejs',
  });
}
