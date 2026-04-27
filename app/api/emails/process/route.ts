import { NextRequest, NextResponse } from 'next/server';
import { EmailManagementService } from '@/server/services/EmailManagementService';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Process email as invoice/receipt
 * Creates incoming_invoice record and copies attachments
 */
export async function POST(request: NextRequest) {
  try {
    const { emailId, label } = await request.json();

    if (!emailId || !label) {
      return NextResponse.json(
        { error: 'Missing emailId or label' },
        { status: 400 }
      );
    }

    if (label !== 'incoming_invoice' && label !== 'receipt') {
      return NextResponse.json(
        { error: 'Invalid label - must be incoming_invoice or receipt' },
        { status: 400 }
      );
    }

    // Create email service
    const emailService = new EmailManagementService(supabase, {
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASSWORD || '',
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
    });

    // Get the email
    const email = await emailService.getEmailById(emailId);

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Process as invoice (this is the private method, so we'll need to expose it or duplicate logic)
    // For now, let's just call updateEmailLabel which triggers the processing
    await emailService.updateEmailLabel(emailId, label);

    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
    });
  } catch (error) {
    console.error('❌ Failed to process email:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
