import { NextRequest, NextResponse } from 'next/server';
import { createSmtpServiceFromEnv } from '@/server/core/email/SmtpEmailService';
import {
  generateInvoiceEmailHtml,
  generateInvoiceEmailText,
} from '@/server/core/email/templates/InvoiceEmailTemplate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    // Create fake invoice data for testing
    const testInvoiceData = {
      clientName: 'Jaime Essed',
      invoiceNumber: 'INV-20260501-TEST',
      totalAmount: 2450.0,
      dueDate: 'May 15, 2026',
      invoiceDate: 'May 01, 2026',
      projectName: 'Website Redesign Project',
    };

    const subject = `Test Invoice ${testInvoiceData.invoiceNumber}`;
    const html = generateInvoiceEmailHtml(testInvoiceData);
    const text = generateInvoiceEmailText(testInvoiceData);

    // Generate a sample PDF using jsPDF
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();

    // Create simple test invoice PDF
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Invoice Number: ${testInvoiceData.invoiceNumber}`, 20, 40);
    doc.text(`Date: ${testInvoiceData.invoiceDate}`, 20, 50);
    doc.text(`Due Date: ${testInvoiceData.dueDate}`, 20, 60);

    doc.setFontSize(14);
    doc.text('Bill To:', 20, 80);
    doc.setFontSize(12);
    doc.text(testInvoiceData.clientName, 20, 90);

    doc.setFontSize(14);
    doc.text('Services:', 20, 110);
    doc.setFontSize(12);
    doc.text(testInvoiceData.projectName || 'Consulting Services', 20, 120);

    doc.setFontSize(16);
    doc.text(`Total Amount: €${testInvoiceData.totalAmount.toFixed(2)}`, 20, 150);

    doc.setFontSize(10);
    doc.text('Thank you for your business!', 20, 180);
    doc.text('Riemer van der Vliet', 20, 190);
    doc.text('riemer@riemer.fyi', 20, 200);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Create and send email
    const smtpService = createSmtpServiceFromEnv();

    // First verify connection
    const verified = await smtpService.verifyConnection();
    if (!verified) {
      return NextResponse.json(
        { error: 'SMTP connection verification failed. Check your SMTP credentials.' },
        { status: 500 }
      );
    }

    // Send test email with PDF attachment
    const result = await smtpService.sendEmail({
      to,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `${testInvoiceData.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    console.log('✅ Test email sent successfully!', {
      to,
      subject,
      messageId: result.messageId,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: result.messageId,
      sentTo: to,
      subject,
    });
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
