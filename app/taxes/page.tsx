'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TaxesPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: taxCalc, isLoading: loadingTaxCalc } = trpc.tax.getIncomeTaxCalculation.useQuery({ year: selectedYear });

  // Generate available years (2025, 2026, etc.)
  const availableYears = [2025, 2026, 2027];

  if (loadingTaxCalc) {
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tax Overview</h1>
          </div>
          <Button
            onClick={() => router.push('/tax-configuration')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Tax Configuration
          </Button>
        </div>

        {/* Year Selection */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
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
          </CardContent>
        </Card>
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
                {taxCalc?.self_employed_deduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-800">Zelfstandigenaftrek (Self-employed deduction)</span>
                    <span className="font-medium text-blue-900">- €{taxCalc?.self_employed_deduction?.toFixed(2)}</span>
                  </div>
                )}
                {taxCalc?.startup_deduction > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-800">Startersaftrek (Startup deduction)</span>
                    <span className="font-medium text-blue-900">- €{taxCalc?.startup_deduction?.toFixed(2)}</span>
                  </div>
                )}
                {taxCalc?.custom_benefits?.map((benefit: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-blue-800">{benefit.name}</span>
                    <span className="font-medium text-blue-900">- €{benefit.amount?.toFixed(2)}</span>
                  </div>
                ))}
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

              {/* Tax Before Credits */}
              <div className="flex justify-between items-center py-4 bg-orange-100 rounded-lg px-4 mt-4">
                <div>
                  <p className="font-bold text-orange-900 text-lg">Tax Before Credits</p>
                  <p className="text-sm text-orange-700">Before heffingskortingen</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">€{taxCalc?.total_income_tax_before_credits?.toFixed(2)}</p>
              </div>

              {/* Tax Credits (Heffingskortingen) */}
              {(taxCalc?.algemene_heffingskorting > 0 || taxCalc?.arbeidskorting > 0) && (
                <div className="bg-green-50 p-4 rounded-lg space-y-2 mt-4">
                  <p className="font-medium text-green-900">Tax Credits (Heffingskortingen)</p>
                  {taxCalc?.algemene_heffingskorting > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">Algemene heffingskorting</span>
                      <span className="font-medium text-green-900">- €{taxCalc?.algemene_heffingskorting?.toFixed(2)}</span>
                    </div>
                  )}
                  {taxCalc?.arbeidskorting > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">Arbeidskorting</span>
                      <span className="font-medium text-green-900">- €{taxCalc?.arbeidskorting?.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Final Tax */}
              <div className="flex justify-between items-center py-4 bg-red-100 rounded-lg px-4 mt-4">
                <div>
                  <p className="font-bold text-red-900 text-lg">Final Income Tax to Pay</p>
                  <p className="text-sm text-red-700">Effective rate: {taxCalc?.effective_tax_rate?.toFixed(2)}%</p>
                </div>
                <p className="text-2xl font-bold text-red-900">€{taxCalc?.total_income_tax?.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
