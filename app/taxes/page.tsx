'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TaxesPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<'year' | 'quarter'>('year');
  const [selectedQuarter, setSelectedQuarter] = useState(`${currentYear}Q${currentQuarter}`);

  const { data: taxCalc, isLoading: loadingTaxCalc } = trpc.tax.getIncomeTaxCalculation.useQuery({ year: selectedYear });
  const { data: vatSettlement, isLoading: loadingVAT } = trpc.tax.getVATSettlement.useQuery({ year: selectedYear });
  const { data: taxSummary, isLoading: loadingSummary } = trpc.tax.getTaxSummary.useQuery();

  // Generate available years (2025, 2026, etc.)
  const availableYears = [2025, 2026, 2027];

  // Generate available quarters from 2025Q4 onwards
  const availableQuarters: string[] = [];
  for (let year = 2025; year <= currentYear + 1; year++) {
    const startQ = year === 2025 ? 4 : 1;
    const endQ = year === currentYear ? currentQuarter : 4;
    for (let q = startQ; q <= endQ; q++) {
      availableQuarters.push(`${year}Q${q}`);
    }
  }

  if (loadingTaxCalc || loadingVAT || loadingSummary) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const selectedQuarterData = viewMode === 'quarter' && vatSettlement
    ? vatSettlement.find(q => q.period === selectedQuarter)
    : null;

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tax Overview</h1>
            <p className="text-slate-600 mt-1">Income tax brackets and VAT settlement for the Netherlands</p>
          </div>
          <Button
            onClick={() => router.push('/tax')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Tax Configuration
          </Button>
        </div>

        {/* Enhanced Period Navigation Bar */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">View by:</span>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'year' | 'quarter')} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="year" className="text-sm">Full Year</TabsTrigger>
                      <TabsTrigger value="quarter" className="text-sm">Quarter</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Year Selection for Yearly View */}
              {viewMode === 'year' && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <span className="text-sm font-medium text-slate-700 min-w-[80px]">Select Year:</span>
                  <div className="flex gap-2 flex-wrap">
                    {availableYears.map((year) => {
                      const isCurrentYear = year === new Date().getFullYear();
                      const isSelected = selectedYear === year;
                      return (
                        <Button
                          key={year}
                          variant="outline"
                          onClick={() => setSelectedYear(year)}
                          className={`${isSelected ? 'bg-blue-900 text-white border-blue-900 hover:bg-blue-800' : ''} ${isCurrentYear && !isSelected ? 'border-blue-500 border-2' : ''} min-w-[100px]`}
                        >
                          {year}
                          {isCurrentYear && <span className="ml-2 text-xs">(current)</span>}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quarter Selection for Quarterly View */}
              {viewMode === 'quarter' && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 min-w-[80px]">Select Quarter:</span>
                    <div className="flex gap-2 flex-wrap">
                      {availableQuarters.slice(-8).reverse().map((q) => {
                        const isSelected = selectedQuarter === q;
                        const isCurrent = q === `${currentYear}Q${currentQuarter}`;
                        return (
                          <Button
                            key={q}
                            variant="outline"
                            onClick={() => {
                              setSelectedQuarter(q);
                              const year = parseInt(q.split('Q')[0]);
                              setSelectedYear(year);
                            }}
                            className={`${isSelected ? 'bg-blue-900 text-white border-blue-900 hover:bg-blue-800' : ''} ${isCurrent && !isSelected ? 'border-blue-500 border-2' : ''}`}
                          >
                            {q}
                            {isCurrent && <span className="ml-2 text-xs">(current)</span>}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Jump to All Quarters */}
                  {availableQuarters.length > 8 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700 min-w-[80px]">Or jump to:</span>
                      <select
                        value={selectedQuarter}
                        onChange={(e) => {
                          setSelectedQuarter(e.target.value);
                          const year = parseInt(e.target.value.split('Q')[0]);
                          setSelectedYear(year);
                        }}
                        className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                      >
                        {availableQuarters.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Yearly View */}
        {viewMode === 'year' && (
          <>
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
                <CardTitle className="text-slate-900">VAT Settlement {selectedYear}</CardTitle>
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
          </>
        )}

        {/* Quarterly View */}
        {viewMode === 'quarter' && selectedQuarterData && (
          <>
            {/* Quarter Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-slate-700 text-sm font-medium">VAT Collected</CardTitle>
                  <CardDescription>{selectedQuarter}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    €{(selectedQuarterData.high_rate_vat_collected + selectedQuarterData.low_rate_vat_collected).toFixed(2)}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>High rate (21%):</span>
                      <span>€{selectedQuarterData.high_rate_vat_collected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low rate (9%):</span>
                      <span>€{selectedQuarterData.low_rate_vat_collected.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-slate-700 text-sm font-medium">Input VAT</CardTitle>
                  <CardDescription>VAT paid on expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">€{selectedQuarterData.input_vat.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className={selectedQuarterData.balance > 0 ? 'bg-red-600 border-red-600' : selectedQuarterData.balance < 0 ? 'bg-green-600 border-green-600' : 'bg-slate-600 border-slate-600'}>
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">Net VAT Position</CardTitle>
                  <CardDescription className="text-white/80">
                    {selectedQuarterData.status === 'owed_to_tax_office' ? 'To Pay' : selectedQuarterData.status === 'tax_office_owes_you' ? 'To Receive' : 'Settled'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{selectedQuarterData.net_vat_to_pay.toFixed(2)}</p>
                  <p className="text-sm text-white/80 mt-1">Paid: €{selectedQuarterData.amount_paid.toFixed(2)}</p>
                  <p className="text-sm text-white/80">Balance: €{selectedQuarterData.balance.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Detailed VAT Breakdown - {selectedQuarter}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium text-blue-900 mb-3">VAT Collected on Sales</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-800">High rate (21%)</span>
                        <span className="font-medium text-blue-900">€{selectedQuarterData.high_rate_vat_collected.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-800">Low rate (9%)</span>
                        <span className="font-medium text-blue-900">€{selectedQuarterData.low_rate_vat_collected.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="font-medium text-blue-900">Total Collected</span>
                        <span className="font-bold text-blue-900">€{(selectedQuarterData.high_rate_vat_collected + selectedQuarterData.low_rate_vat_collected).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="font-medium text-green-900 mb-3">Input VAT (Deductible)</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-800">VAT paid on expenses</span>
                        <span className="font-bold text-green-900">€{selectedQuarterData.input_vat.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${selectedQuarterData.balance > 0 ? 'bg-red-50' : selectedQuarterData.balance < 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <p className={`font-bold text-lg ${selectedQuarterData.balance > 0 ? 'text-red-900' : selectedQuarterData.balance < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                        Net VAT to {selectedQuarterData.balance > 0 ? 'Pay' : selectedQuarterData.balance < 0 ? 'Receive' : 'Settle'}
                      </p>
                      <p className={`text-2xl font-bold ${selectedQuarterData.balance > 0 ? 'text-red-900' : selectedQuarterData.balance < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                        €{selectedQuarterData.net_vat_to_pay.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={selectedQuarterData.balance > 0 ? 'text-red-800' : selectedQuarterData.balance < 0 ? 'text-green-800' : 'text-slate-800'}>Amount already paid</span>
                        <span className={`font-medium ${selectedQuarterData.balance > 0 ? 'text-red-900' : selectedQuarterData.balance < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                          €{selectedQuarterData.amount_paid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className={`font-bold ${selectedQuarterData.balance > 0 ? 'text-red-900' : selectedQuarterData.balance < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                          Outstanding Balance
                        </span>
                        <span className={`text-xl font-bold ${selectedQuarterData.balance > 0 ? 'text-red-900' : selectedQuarterData.balance < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                          €{selectedQuarterData.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedQuarterData.status === 'owed_to_tax_office' && (
                    <div className="bg-red-100 border border-red-300 p-4 rounded-lg">
                      <Badge variant="destructive" className="mb-2">Action Required</Badge>
                      <p className="text-sm text-red-900">You owe €{selectedQuarterData.balance.toFixed(2)} to the tax office for this quarter.</p>
                    </div>
                  )}

                  {selectedQuarterData.status === 'tax_office_owes_you' && (
                    <div className="bg-green-100 border border-green-300 p-4 rounded-lg">
                      <Badge className="bg-green-600 mb-2">Expected Refund</Badge>
                      <p className="text-sm text-green-900">The tax office owes you €{selectedQuarterData.expected_refund.toFixed(2)} for this quarter.</p>
                    </div>
                  )}

                  {selectedQuarterData.status === 'settled' && (
                    <div className="bg-slate-100 border border-slate-300 p-4 rounded-lg">
                      <Badge variant="outline" className="mb-2">Settled</Badge>
                      <p className="text-sm text-slate-900">This quarter has been fully settled with the tax office.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {viewMode === 'quarter' && !selectedQuarterData && (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">No data available for {selectedQuarter}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
