import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createSmtpServiceFromEnv } from '@/server/core/email/SmtpEmailService';
import {
  generateInvoiceEmailHtml,
  generateInvoiceEmailText,
  generateInvoiceEmailSubject,
} from '@/server/core/email/templates/InvoiceEmailTemplate';
import { formatDate } from '@/lib/utils/date';

export const runtime = 'nodejs';

interface SendEmailRequest {
  to?: string; // Override recipient for testing
  cc?: string;
  preview?: boolean; // If true, return email content without sending
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    // Parse request body
    const body: SendEmailRequest = await request.json().catch(() => ({}));

    // Create Supabase admin client (server-side with service role key)
    const supabase = createAdminClient();

    // Fetch invoice with client details
    const { data: invoice, error: invoiceError } = await supabase
      .from('backoffice_invoices')
      .select(
        `
        *,
        client:backoffice_companies!client_id (name, email),
        project:backoffice_projects!project_id (name)
      `
      )
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if PDF exists
    if (!invoice.pdf_file) {
      return NextResponse.json(
        { error: 'Invoice PDF not generated. Please generate PDF first.' },
        { status: 400 }
      );
    }

    // Determine recipient
    const recipientEmail = body.to || invoice.client?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No recipient email address found. Please provide a recipient.' },
        { status: 400 }
      );
    }

    // Generate email content
    const emailData = {
      clientName: invoice.client?.name || 'Valued Client',
      invoiceNumber: invoice.invoice_number,
      totalAmount: parseFloat(String(invoice.total_amount || 0)),
      dueDate: formatDate(invoice.due_date, 'MMMM dd, yyyy'),
      invoiceDate: formatDate(invoice.invoice_date, 'MMMM dd, yyyy'),
      projectName: invoice.project?.name,
    };

    const subject = generateInvoiceEmailSubject(invoice.invoice_number);
    const html = generateInvoiceEmailHtml(emailData);
    const text = generateInvoiceEmailText(emailData);

    // If preview mode, return email content without sending
    if (body.preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        email: {
          to: recipientEmail,
          cc: body.cc,
          subject,
          html,
          text,
          attachments: [
            {
              filename: `${invoice.invoice_number}.pdf`,
              path: invoice.pdf_file,
            },
          ],
        },
      });
    }

    // Download PDF from Supabase Storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(invoice.pdf_file);

    if (downloadError || !pdfBlob) {
      console.error('Failed to download PDF from storage:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download invoice PDF from storage' },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Send email via SMTP
    const smtpService = createSmtpServiceFromEnv();

    const result = await smtpService.sendEmail({
      to: recipientEmail,
      cc: body.cc,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('✅ Invoice email sent successfully:', {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      to: recipientEmail,
      messageId: result.messageId,
    });

    // TODO: Update invoice status to 'sent' (implement later)
    // await supabase
    //   .from('backoffice_invoices')
    //   .update({ status: 'sent' })
    //   .eq('id', invoiceId);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: recipientEmail,
    });
  } catch (error: any) {
    console.error('❌ Failed to send invoice email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}
