import { router, publicProcedure } from '@/server/trpc';
import { z } from 'zod';
import { DocumentParser } from '@/server/core/parsers/DocumentParser';
import { LLMService } from '@/server/core/llm/LLMService';

const INVOICE_SCHEMA = `{
  "supplier_name": "string (company/supplier name)",
  "invoice_date": "string (YYYY-MM-DD format)",
  "total_amount": "number (total amount including VAT)",
  "tax_amount": "number (VAT amount if specified)",
  "subtotal": "number (amount before VAT)",
  "description": "string (brief description)",
  "invoice_number": "string (invoice/reference number if present)",
  "currency": "string (3-letter ISO currency code like EUR, USD, GBP)",
  "language": "string (2-letter ISO language code like en, nl, fr)"
}`;

const invoiceIngestionRouter = router({
  // Extract invoice data from PDF
  extractInvoice: publicProcedure
    .input(z.object({
      pdfBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const documentParser = new DocumentParser();
        const llmService = new LLMService();

        // Parse PDF to text
        const pdfBuffer = Buffer.from(input.pdfBase64, 'base64');
        const extractedText = await documentParser.parsePdf(pdfBuffer);

        // Extract structured data using LLM
        const extractedData = await llmService.extractStructuredData(
          extractedText,
          INVOICE_SCHEMA,
          'invoice-extraction'
        );

        return extractedData;
      } catch (error) {
        console.error('❌ Invoice extraction failed:', error);
        throw new Error('Failed to extract invoice data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }),

  // Automatically check email for new invoices
  processInvoices: publicProcedure.mutation(async () => {
    // TODO: Implement email ingestion with Supabase
    throw new Error('Email invoice ingestion not yet implemented with Supabase');
  }),

  // Get pending invoices (expense: anys without categories/projects)
  getPendingInvoices: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('expenses')
      .select('id, date, supplier_name, description, amount, vat_amount, receipt_filename, created_at')
      .or('category_id.is.null,project_id.is.null')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }),
});

export { invoiceIngestionRouter };
