'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function TaxesPage() {
  const currentYear = new Date().getFullYear();

  const { data: taxCalc, isLoading: loadingTaxCalc } = trpc.tax.getIncomeTaxCalculation.useQuery({ year: currentYear });
  const { data: vatSettlement, isLoading: loadingVAT } = trpc.tax.getVATSettlement.useQuery({ year: currentYear });
  const { data: taxSummary, isLoading: loadingSummary } = trpc.tax.getTaxSummary.useQuery();

  if (loadingTaxCalc || loadingVAT || loadingSummary) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Overview {currentYear}</h1>
          <p className="text-slate-600 mt-1">Income tax brackets and VAT settlement for the Netherlands</p>
        </div>

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{taxCalc?.gross_profit?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-500 mt-1">Revenue - Expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Taxable Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{taxCalc?.taxable_income?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-500 mt-1">After deductions</p>
            </CardContent>
          </Card>

          <Card className="bg-red-600 border-red-600">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Income Tax Owed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{taxCalc?.total_income_tax?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-red-100 mt-1">Effective: {taxCalc?.effective_tax_rate?.toFixed(1) || '0'}%</p>
            </CardContent>
          </Card>

          <Card className="bg-green-600 border-green-600">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Net After Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{taxCalc?.net_profit_after_tax?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-green-100 mt-1">Your take-home</p>
            </CardContent>
          </Card>
        </div>

        {/* Income Tax Breakdown */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Income Tax Calculation Breakdown</CardTitle>
            <CardDescription>Dutch tax brackets for {currentYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Step 1: Gross Profit */}
              <div className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-medium text-slate-900">Gross Profit</p>
                  <p className="text-sm text-slate-600">Total revenue minus expenses (excl. VAT)</p>
                </div>
                <p className="text-lg font-bold text-slate-900">€{taxCalc?.gross_profit?.toFixed(2)}</p>
              </div>

              {/* Step 2: Deductions */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="font-medium text-blue-900">Deductions</p>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-800">Zelfstandigenaftrek (Self-employed deduction)</span>
                  <span className="font-medium text-blue-900">- €{taxCalc?.self_employed_deduction?.toFixed(2)}</span>
                </div>
                {taxCalc?.startup_deduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-800">Startersaftrek (Startup deduction)</span>
                    <span className="font-medium text-blue-900">- €{taxCalc?.startup_deduction?.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Step 3: After Deductions */}
              <div className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-medium text-slate-900">Profit After Deductions</p>
                </div>
                <p className="text-lg font-bold text-slate-900">€{taxCalc?.profit_after_deductions?.toFixed(2)}</p>
              </div>

              {/* Step 4: MKB Exemption */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-green-900">MKB-winstvrijstelling (SME Profit Exemption)</p>
                    <p className="text-sm text-green-700">{taxCalc?.mkb_profit_exemption}% of profit after deductions</p>
                  </div>
                  <span className="font-medium text-green-900">- €{taxCalc?.mkb_exemption_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Step 5: Taxable Income */}
              <div className="flex justify-between items-center py-3 border-b border-slate-900">
                <div>
                  <p className="font-bold text-slate-900">Taxable Income</p>
                  <p className="text-sm text-slate-600">Amount subject to income tax</p>
                </div>
                <p className="text-xl font-bold text-slate-900">€{taxCalc?.taxable_income?.toFixed(2)}</p>
              </div>

              {/* Tax Brackets */}
              <div className="space-y-3 mt-6">
                <p className="font-medium text-slate-900">Tax Calculation by Bracket:</p>

                {/* Bracket 1 */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-orange-900">Bracket 1 (up to €{taxCalc?.bracket_1_limit?.toLocaleString()})</span>
                    <span className="text-orange-700">{taxCalc?.bracket_1_rate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700">Tax in this bracket</span>
                    <span className="font-bold text-orange-900">€{taxCalc?.tax_bracket_1?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bracket 2 */}
                {taxCalc?.tax_bracket_2 > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-red-900">Bracket 2 (above €{taxCalc?.bracket_1_limit?.toLocaleString()})</span>
                      <span className="text-red-700">{taxCalc?.bracket_2_rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-700">Tax in this bracket</span>
                      <span className="font-bold text-red-900">€{taxCalc?.tax_bracket_2?.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Tax */}
              <div className="flex justify-between items-center py-4 bg-red-100 rounded-lg px-4 mt-4">
                <div>
                  <p className="font-bold text-red-900 text-lg">Total Income Tax to Pay</p>
                  <p className="text-sm text-red-700">Effective rate: {taxCalc?.effective_tax_rate?.toFixed(2)}%</p>
                </div>
                <p className="text-2xl font-bold text-red-900">€{taxCalc?.total_income_tax?.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VAT Settlement */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">VAT Settlement {currentYear}</CardTitle>
            <CardDescription>Quarterly BTW overview with payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">VAT Collected</TableHead>
                  <TableHead className="text-right">Input VAT</TableHead>
                  <TableHead className="text-right">Net to Pay</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vatSettlement?.map((quarter: any) => (
                  <TableRow key={quarter.period}>
                    <TableCell className="font-medium">{quarter.period}</TableCell>
                    <TableCell className="text-right">€{(quarter.high_rate_vat_collected + quarter.low_rate_vat_collected).toFixed(2)}</TableCell>
                    <TableCell className="text-right">€{quarter.input_vat.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">€{quarter.net_vat_to_pay.toFixed(2)}</TableCell>
                    <TableCell className="text-right">€{quarter.amount_paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={quarter.balance > 0 ? 'text-red-600 font-medium' : quarter.balance < 0 ? 'text-green-600 font-medium' : ''}>
                        €{quarter.balance.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {quarter.status === 'owed_to_tax_office' && (
                        <Badge variant="destructive">Owed</Badge>
                      )}
                      {quarter.status === 'tax_office_owes_you' && (
                        <Badge className="bg-green-600">To Receive: €{quarter.expected_refund.toFixed(2)}</Badge>
                      )}
                      {quarter.status === 'settled' && (
                        <Badge variant="outline">Settled</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* VAT Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700 mb-1">Total VAT to Pay</p>
                <p className="text-2xl font-bold text-red-900">€{taxSummary?.vat_to_pay?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Total VAT to Receive</p>
                <p className="text-2xl font-bold text-green-900">€{taxSummary?.vat_to_receive?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Net VAT Position</p>
                <p className={`text-2xl font-bold ${(taxSummary?.vat_to_pay - taxSummary?.vat_to_receive) > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  €{((taxSummary?.vat_to_pay || 0) - (taxSummary?.vat_to_receive || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
