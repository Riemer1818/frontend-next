import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportPDFs() {
  console.log('Fetching invoices with PDFs...');

  // Get all invoices that have PDFs
  const { data: invoices, error } = await supabase
    .from('backoffice_invoices')
    .select('id, invoice_number, pdf_file')
    .not('pdf_file', 'is', null);

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  console.log(`Found ${invoices.length} invoices with PDFs`);

  // Create pdfs directory if it doesn't exist
  const pdfsDir = path.join(process.cwd(), 'public', 'pdfs', 'invoices');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  for (const invoice of invoices) {
    try {
      console.log(`Processing invoice ${invoice.invoice_number} (ID: ${invoice.id})...`);

      // Use RPC function to get base64
      const { data: base64Data, error: rpcError } = await supabase.rpc('get_invoice_pdf_base64', {
        invoice_id: invoice.id
      });

      if (rpcError || !base64Data) {
        console.error(`  Failed to get PDF for invoice ${invoice.id}:`, rpcError);
        continue;
      }

      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      // Save to file
      const filename = `${invoice.invoice_number}.pdf`;
      const filepath = path.join(pdfsDir, filename);
      fs.writeFileSync(filepath, pdfBuffer);

      console.log(`  ✓ Saved ${filename} (${pdfBuffer.length} bytes)`);
    } catch (err) {
      console.error(`  Error processing invoice ${invoice.id}:`, err);
    }
  }

  console.log('\nDone! PDFs exported to:', pdfsDir);
}

exportPDFs().catch(console.error);
