import { router, publicProcedure } from '@/server/trpc';
import { InvoiceIngestionApp } from '../apps/invoice-ingestion/InvoiceIngestionApp';

const invoiceIngestionRouter = router({
  // Automatically check email for new invoices
  processInvoices: publicProcedure.mutation(async ({ ctx }) => {
    console.log('📧 [Manual] Starting invoice ingestion from email...');

    try {
      const ingestionApp = new InvoiceIngestionApp(ctx.db);
      await ingestionApp.processInvoices();

      console.log('✅ [Manual] Invoice ingestion completed');

      return {
        success: true,
        message: 'Invoice ingestion completed successfully',
      };
    } catch (error) {
      console.error('❌ [Manual] Invoice ingestion failed:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
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
