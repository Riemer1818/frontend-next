'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BTWDeclarationPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  const { data: vatSettlement, isLoading } = trpc.tax.getVATSettlement.useQuery({ year: selectedYear });

  // Generate available years and quarters
  const availableYears = [2025, 2026, 2027];
  const availableQuarters = [1, 2, 3, 4];

  // Get data for selected quarter
  const quarterData = vatSettlement?.find(
    (q: any) => q.year === selectedYear && q.quarter === selectedQuarter
  );

  if (isLoading) {
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
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/money')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Money
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">BTW Aangifte</h1>
              <p className="text-slate-600 mt-1">Quarterly VAT Declaration - Ready for Filing</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Period Selector */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Year:</span>
                <div className="flex gap-2">
                  {availableYears.map((year) => (
                    <Button
                      key={year}
                      variant="outline"
                      onClick={() => setSelectedYear(year)}
                      className={selectedYear === year ? 'bg-blue-900 text-white border-blue-900' : ''}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Quarter:</span>
                <div className="flex gap-2">
                  {availableQuarters.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      onClick={() => setSelectedQuarter(q)}
                      className={selectedQuarter === q ? 'bg-blue-900 text-white border-blue-900' : ''}
                    >
                      Q{q}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="ml-auto">
                <Badge variant="outline" className="text-base px-4 py-2">
                  {selectedYear} Q{selectedQuarter}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {!quarterData && (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">No data available for {selectedYear} Q{selectedQuarter}</p>
            </CardContent>
          </Card>
        )}

        {quarterData && (
          <>
            {/* Summary Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900 text-sm font-medium">Total VAT Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-900">
                    €{(quarterData.high_rate_vat_collected + quarterData.low_rate_vat_collected).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900 text-sm font-medium">Input VAT (Voorbelasting)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-900">€{quarterData.input_vat.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className={quarterData.net_vat_to_pay > 0 ? 'bg-red-600 border-red-600' : 'bg-green-600 border-green-600'}>
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">
                    {quarterData.net_vat_to_pay > 0 ? 'To Pay' : 'To Receive'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{Math.abs(quarterData.net_vat_to_pay).toFixed(2)}</p>
                  {quarterData.status === 'settled' && (
                    <Badge variant="outline" className="mt-2 bg-white/20 text-white border-white/40">Settled</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main BTW Declaration Form */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  BTW Aangifte - {selectedYear} Q{selectedQuarter}
                </CardTitle>
                <CardDescription>5 Key Questions for Dutch Tax Office Filing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question 1a: High Rate (21%) */}
                <div className="border-l-4 border-blue-600 pl-6 py-4 bg-blue-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-blue-900 text-lg">1a. Leveringen/diensten belast met hoog tarief</h3>
                      <p className="text-sm text-blue-700 mt-1">Supplies/services at high rate (21%)</p>
                    </div>
                    <Badge className="bg-blue-900">High Rate</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Omzet (excl. BTW)</p>
                      <p className="text-2xl font-bold text-slate-900">€{quarterData.high_rate_revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">BTW (21%)</p>
                      <p className="text-2xl font-bold text-blue-900">€{quarterData.high_rate_vat_collected.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Question 1b: Low Rate (9%) */}
                <div className="border-l-4 border-green-600 pl-6 py-4 bg-green-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-green-900 text-lg">1b. Leveringen/diensten belast met laag tarief</h3>
                      <p className="text-sm text-green-700 mt-1">Supplies/services at low rate (9%)</p>
                    </div>
                    <Badge className="bg-green-700">Low Rate</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Omzet (excl. BTW)</p>
                      <p className="text-2xl font-bold text-slate-900">€{quarterData.low_rate_revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">BTW (9%)</p>
                      <p className="text-2xl font-bold text-green-900">€{quarterData.low_rate_vat_collected.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Question 1c: Other Rates */}
                <div className="border-l-4 border-orange-600 pl-6 py-4 bg-orange-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-orange-900 text-lg">1c. Leveringen/diensten belast met overige tarieven, behalve 0%</h3>
                      <p className="text-sm text-orange-700 mt-1">Other rates (e.g., 13% sports canteen)</p>
                    </div>
                    <Badge className="bg-orange-600">Other</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Omzet & BTW</p>
                    <p className="text-2xl font-bold text-slate-900">€0.00</p>
                    <p className="text-xs text-slate-500 mt-2">Not applicable for this period</p>
                  </div>
                </div>

                {/* Question 1d: Private Use */}
                <div className="border-l-4 border-purple-600 pl-6 py-4 bg-purple-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-purple-900 text-lg">1d. Privégebruik</h3>
                      <p className="text-sm text-purple-700 mt-1">Private use correction (yearly adjustment)</p>
                    </div>
                    <Badge className="bg-purple-600">Annual</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">BTW over privégebruik</p>
                    <p className="text-2xl font-bold text-slate-900">€0.00</p>
                    <p className="text-xs text-slate-500 mt-2">Fill this in Q4 only</p>
                  </div>
                </div>

                {/* Question 1e: Zero Rate or Not Taxed */}
                <div className="border-l-4 border-slate-600 pl-6 py-4 bg-slate-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">1e. Leveringen/diensten belast met 0% of niet bij u belast</h3>
                      <p className="text-sm text-slate-700 mt-1">Zero-rated or reverse charge supplies</p>
                    </div>
                    <Badge variant="outline">0% / Reverse</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Omzet (0% tarief)</p>
                    <p className="text-2xl font-bold text-slate-900">€{quarterData.zero_rate_revenue.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-2">Includes exports & reverse charge</p>
                  </div>
                </div>

                {/* Question 2a: Reverse Charge (Verleggingsregeling) */}
                <div className="border-l-4 border-indigo-600 pl-6 py-4 bg-indigo-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-indigo-900 text-lg">2a. Leveringen/diensten waarbij de btw naar u is verlegd</h3>
                      <p className="text-sm text-indigo-700 mt-1">Reverse charge - VAT shifted to you as buyer</p>
                    </div>
                    <Badge className="bg-indigo-600">Input</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Omzet</p>
                      <p className="text-2xl font-bold text-slate-900">€0.00</p>
                      <p className="text-xs text-slate-500 mt-2">Not tracked separately yet</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">BTW (verlegd)</p>
                      <p className="text-2xl font-bold text-indigo-900">€0.00</p>
                      <p className="text-xs text-slate-500 mt-2">Deductible at 5b</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Prestaties naar het buitenland */}
                <div className="border-t-2 border-slate-300 pt-6 mt-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Rubriek 3: Prestaties naar het buitenland</h2>
                </div>

                {/* Question 3a: Exports (non-EU) */}
                <div className="border-l-4 border-cyan-600 pl-6 py-4 bg-cyan-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-cyan-900 text-lg">3a. Leveringen naar landen buiten de EU (uitvoer)</h3>
                      <p className="text-sm text-cyan-700 mt-1">Exports to countries outside the EU</p>
                    </div>
                    <Badge className="bg-cyan-600">Non-EU</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Omzet (0% tarief)</p>
                    <p className="text-2xl font-bold text-slate-900">
                      €{(quarterData.exports_non_eu || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Based on client country</p>
                  </div>
                </div>

                {/* Question 3b: EU Supplies/Services */}
                <div className="border-l-4 border-blue-500 pl-6 py-4 bg-blue-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-blue-900 text-lg">3b. Leveringen naar of diensten in landen binnen de EU</h3>
                      <p className="text-sm text-blue-700 mt-1">Intra-community supplies/services</p>
                    </div>
                    <Badge className="bg-blue-500">EU</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Omzet (0% tarief)</p>
                    <p className="text-2xl font-bold text-slate-900">
                      €{(quarterData.exports_eu || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Based on client country</p>
                  </div>
                </div>

                {/* Question 3c: Installation/Distance Sales within EU */}
                <div className="border-l-4 border-teal-600 pl-6 py-4 bg-teal-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-teal-900 text-lg">3c. Installatie/afstandsverkopen binnen de EU</h3>
                      <p className="text-sm text-teal-700 mt-1">Installation/distance sales within EU</p>
                    </div>
                    <Badge className="bg-teal-600">EU</Badge>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Omzet</p>
                    <p className="text-2xl font-bold text-slate-900">€0.00</p>
                    <p className="text-xs text-slate-500 mt-2">Not applicable for services</p>
                  </div>
                </div>

                {/* Section 4: Prestaties vanuit het buitenland */}
                <div className="border-t-2 border-slate-300 pt-6 mt-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Rubriek 4: Prestaties vanuit het buitenland aan u verricht</h2>
                </div>

                {/* Question 4a: Supplies/Services from non-EU */}
                <div className="border-l-4 border-amber-600 pl-6 py-4 bg-amber-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg">4a. Leveringen/diensten uit landen buiten de EU</h3>
                      <p className="text-sm text-amber-700 mt-1">Purchases from countries outside the EU</p>
                    </div>
                    <Badge className="bg-amber-600">Non-EU Import</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Omzet</p>
                      <p className="text-2xl font-bold text-slate-900">
                        €{(quarterData.imports_non_eu_revenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">BTW</p>
                      <p className="text-2xl font-bold text-amber-900">
                        €{(quarterData.imports_non_eu_vat || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Based on supplier country</p>
                </div>

                {/* Question 4b: Supplies/Services from EU */}
                <div className="border-l-4 border-lime-600 pl-6 py-4 bg-lime-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lime-900 text-lg">4b. Leveringen/diensten uit landen binnen de EU</h3>
                      <p className="text-sm text-lime-700 mt-1">Intra-community acquisitions</p>
                    </div>
                    <Badge className="bg-lime-600">EU Import</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Omzet</p>
                      <p className="text-2xl font-bold text-slate-900">
                        €{(quarterData.imports_eu_revenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">BTW</p>
                      <p className="text-2xl font-bold text-lime-900">
                        €{(quarterData.imports_eu_vat || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Based on supplier country</p>
                </div>

                {/* Input VAT (Voorbelasting) - Box 5b reference */}
                <div className="border-t-2 border-slate-300 pt-6 mt-6">
                  <div className="bg-green-100 p-6 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-green-900 text-lg">5b. Voorbelasting (Input VAT)</h3>
                        <p className="text-sm text-green-700 mt-1">VAT paid on business expenses - deductible</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-700 mb-1">Total voorbelasting</p>
                        <p className="text-3xl font-bold text-green-900">€{quarterData.input_vat.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final Calculation */}
                <div className="border-t-2 border-slate-300 pt-6 mt-6">
                  <div className={`p-6 rounded-lg ${quarterData.net_vat_to_pay > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-bold text-lg ${quarterData.net_vat_to_pay > 0 ? 'text-red-900' : 'text-green-900'}`}>
                          Te betalen / terug te ontvangen BTW
                        </h3>
                        <p className={`text-sm mt-1 ${quarterData.net_vat_to_pay > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {quarterData.net_vat_to_pay > 0 ? 'Amount to pay to tax office' : 'Amount to receive from tax office'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-4xl font-bold ${quarterData.net_vat_to_pay > 0 ? 'text-red-900' : 'text-green-900'}`}>
                          €{Math.abs(quarterData.net_vat_to_pay).toFixed(2)}
                        </p>
                        {quarterData.amount_paid > 0 && (
                          <p className="text-sm mt-2 text-slate-600">
                            Paid: €{quarterData.amount_paid.toFixed(2)} | Balance: €{quarterData.balance.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </MainLayout>
  );
}