import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { InvoicePdfGenerator } from '@/server/core/pdf/InvoicePdfGenerator';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Get summarize option from request body (optional)
    const body = await request.json().catch(() => ({}));
    const summarize = body.summarize !== false; // Default to true

    // Create Supabase client (server-side with service role key)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    );

    // First, get invoice number for storage path
    const { data: invoice, error: invoiceError } = await supabase
      .from('backoffice_invoices')
      .select('invoice_number')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const generator = new InvoicePdfGenerator();
    const pdfBuffer = await generator.generatePdf(invoiceId, supabase, summarize);

    // Upload PDF to Supabase Storage
    const storagePath = `invoices/${invoice.invoice_number}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('Failed to upload PDF to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Update invoice record with storage path (optional - for reference)
    await supabase
      .from('backoffice_invoices')
      .update({ pdf_file: storagePath })
      .eq('id', invoiceId);

    // Return success with PDF as base64 for immediate download
    return NextResponse.json({
      success: true,
      message: 'PDF generated and uploaded successfully',
      pdf: pdfBuffer.toString('base64'),
      publicUrl,
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Create Supabase client (server-side with service role key)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch invoice
    const { data: invoice, error } = await supabase
      .from('backoffice_invoices')
      .select('invoice_number, pdf_file')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (!invoice.pdf_file) {
      return NextResponse.json(
        { error: 'PDF not yet generated for this invoice' },
        { status: 404 }
      );
    }

    // Download PDF from storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(invoice.pdf_file);

    if (downloadError || !pdfBlob) {
      console.error('Failed to download PDF from storage:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download PDF from storage' },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return PDF as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}
