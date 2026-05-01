'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useProject } from '@/lib/supabase/projects';
import { useTimeEntries } from '@/lib/supabase/time-entries';
import { useCreateInvoiceFromProject, useGenerateInvoicePdf } from '@/lib/supabase/invoices';
import { supabase } from '@/lib/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get('project') || '0');
  const timeEntryIds = searchParams.get('timeEntries')?.split(',').map(id => parseInt(id)) || [];

  const [taxRate, setTaxRate] = useState(21);
  const [paymentTermsDays, setPaymentTermsDays] = useState(14);
  const [notes, setNotes] = useState('');

  const { data: project, isLoading: projectLoading } = useProject(projectId > 0 ? projectId : undefined);

  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useTimeEntries(
    projectId > 0 ? { projectId } : undefined
  );

  const createMutation = useCreateInvoiceFromProject();

  const generatePdfMutation = useGenerateInvoicePdf();

  // Filter time entries based on URL params
  const selectedTimeEntries = (timeEntries || []).filter((te: any) =>
    timeEntryIds.length === 0 || timeEntryIds.includes(te.id)
  );

  // Calculate totals
  const totalHours = selectedTimeEntries.reduce((sum: number, te: any) => sum + parseFloat(te.chargeable_hours || '0'), 0);
  const roundedHours = Math.ceil(totalHours); // Round up to whole hours
  const hourlyRate = project?.hourly_rate ? parseFloat(project.hourly_rate) : 0;
  const subtotal = roundedHours * hourlyRate;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleCreate = async () => {
    try {
      console.log('Creating invoice for project:', projectId);
      console.log('Time entry IDs:', timeEntryIds);

      // eslint-disable-next-line react-hooks/purity
      const today = new Date();
      // eslint-disable-next-line react-hooks/purity
      const invoiceDate = today.toISOString().split('T')[0];
      // eslint-disable-next-line react-hooks/purity
      const dueDate = new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Generate invoice number with auto-incrementing sequence
      // eslint-disable-next-line react-hooks/purity
      const datePrefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

      // Get the latest invoice number for today
      const { data: latestInvoices } = await supabase
        .from('backoffice_invoices')
        .select('invoice_number')
        .like('invoice_number', `${datePrefix}-%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (latestInvoices && latestInvoices.length > 0) {
        const lastNumber = latestInvoices[0].invoice_number;
        const lastSequence = parseInt(lastNumber.split('-').pop() || '0');
        sequence = lastSequence + 1;
      }

      // eslint-disable-next-line react-hooks/purity
      const invoiceNumber = `${datePrefix}-${sequence}`;

      const invoice: any = await createMutation.mutateAsync({
        projectId,
        timeEntryIds: timeEntryIds.length > 0 ? timeEntryIds : selectedTimeEntries.map((te: any) => te.id),
        invoiceNumber,
        invoiceDate,
        dueDate,
        notes: notes || null,
      });

      console.log('Invoice mutation result:', invoice);

      if (!invoice || !invoice.id) {
        console.error('Invoice creation returned invalid data:', invoice);
        throw new Error('Failed to create invoice - no invoice data returned');
      }

      console.log('Invoice created successfully:', invoice);
      console.log('Invoice ID:', invoice.id);
      console.log('Generating PDF immediately...');

      // Generate PDF immediately after creation
      try {
        const pdfResult = await generatePdfMutation.mutateAsync({ id: invoice.id });
        console.log('PDF generated successfully:', pdfResult);
      } catch (pdfError: any) {
        console.error('PDF generation failed (invoice still created):', pdfError);
        alert(`Invoice created but PDF generation failed: ${pdfError.message}. You can generate it later from the invoice page.`);
        // Continue anyway - user can generate PDF later
      }

      console.log('Redirecting to invoice page:', `/invoices/${invoice.id}`);
      router.push(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Error in handleCreate:', error);
      alert(`Failed to create invoice: ${error?.message || JSON.stringify(error)}`);
    }
  };

  if (projectLoading || timeEntriesLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
              <p className="text-muted-foreground mt-1">
                {project.name} - {project.client_name}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Entries Summary */}
              <div>
                <Label className="text-sm font-medium text-foreground">Time Entries</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Date</th>
                        <th className="text-left p-3 font-medium text-foreground">Description</th>
                        <th className="text-right p-3 font-medium text-foreground">Hours</th>
                        <th className="text-right p-3 font-medium text-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedTimeEntries.map((entry: any) => (
                        <tr key={entry.id} className="bg-card">
                          <td className="p-3 text-muted-foreground">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3 text-foreground">
                            {entry.notes || 'Werkzaamheden'}
                          </td>
                          <td className="p-3 text-right text-foreground">
                            {parseFloat(entry.chargeable_hours).toFixed(2)}h
                          </td>
                          <td className="p-3 text-right text-foreground">
                            €{(parseFloat(entry.chargeable_hours) * hourlyRate).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label htmlFor="taxRate">VAT Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                  <Input
                    id="paymentTerms"
                    type="number"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Entries:</span>
                  <span className="font-medium text-foreground">{selectedTimeEntries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Hours:</span>
                  <span className="font-medium text-foreground">{totalHours.toFixed(2)}h → {roundedHours}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="font-medium text-foreground">€{hourlyRate.toFixed(2)}/h</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">VAT ({taxRate}%)</span>
                  <span className="font-medium text-foreground">€{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-lg font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    €{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || generatePdfMutation.isPending || selectedTimeEntries.length === 0}
                className="w-full bg-primary hover:bg-primary/90 flex items-center gap-2 mt-6"
              >
                {(createMutation.isPending || generatePdfMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>

              {selectedTimeEntries.length === 0 && (
                <p className="text-sm text-red-600 text-center mt-2">
                  No time entries selected
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
