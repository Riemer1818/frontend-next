'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
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

  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  const { data: timeEntries, isLoading: timeEntriesLoading } = trpc.timeEntries.getAll.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const createMutation = trpc.invoice.createFromProject.useMutation({
    onError: (error) => {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice: ' + error.message);
    },
  });

  const generatePdfMutation = trpc.invoice.generatePdf.useMutation({
    onError: (error) => {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    },
  });

  // Filter time entries based on URL params
  const selectedTimeEntries = timeEntries?.filter(te =>
    timeEntryIds.length === 0 || timeEntryIds.includes(te.id)
  ) || [];

  // Calculate totals
  const totalHours = selectedTimeEntries.reduce((sum, te) => sum + parseFloat(te.chargeable_hours), 0);
  const roundedHours = Math.ceil(totalHours); // Round up to whole hours
  const hourlyRate = project?.hourly_rate ? parseFloat(project.hourly_rate) : 0;
  const subtotal = roundedHours * hourlyRate;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleCreate = async () => {
    try {
      console.log('Creating invoice for project:', projectId);
      console.log('Time entry IDs:', timeEntryIds);

      const invoice = await createMutation.mutateAsync({
        projectId,
        includeTimeEntryIds: timeEntryIds.length > 0 ? timeEntryIds : undefined,
        taxRate,
        paymentTermsDays,
        notes,
      });

      console.log('Invoice created:', invoice);
      console.log('Generating PDF...');

      await generatePdfMutation.mutateAsync({ id: invoice.id });

      console.log('PDF generated, redirecting...');
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error in handleCreate:', error);
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
          <p className="text-slate-500">Project not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
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
              <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
              <p className="text-slate-600 mt-1">
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
                <Label className="text-sm font-medium text-slate-700">Time Entries</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-700">Date</th>
                        <th className="text-left p-3 font-medium text-slate-700">Description</th>
                        <th className="text-right p-3 font-medium text-slate-700">Hours</th>
                        <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedTimeEntries.map((entry) => (
                        <tr key={entry.id} className="bg-white">
                          <td className="p-3 text-slate-600">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3 text-slate-900">
                            {entry.notes || 'Werkzaamheden'}
                          </td>
                          <td className="p-3 text-right text-slate-900">
                            {parseFloat(entry.chargeable_hours).toFixed(2)}h
                          </td>
                          <td className="p-3 text-right text-slate-900">
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
                  <span className="text-slate-600">Time Entries:</span>
                  <span className="font-medium text-slate-900">{selectedTimeEntries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Hours:</span>
                  <span className="font-medium text-slate-900">{totalHours.toFixed(2)}h → {roundedHours}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Hourly Rate:</span>
                  <span className="font-medium text-slate-900">€{hourlyRate.toFixed(2)}/h</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-700">Subtotal</span>
                  <span className="font-medium text-slate-900">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">VAT ({taxRate}%)</span>
                  <span className="font-medium text-slate-900">€{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-slate-900">
                    €{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || generatePdfMutation.isPending || selectedTimeEntries.length === 0}
                className="w-full bg-blue-900 hover:bg-blue-800 flex items-center gap-2 mt-6"
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
