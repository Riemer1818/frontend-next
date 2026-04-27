'use client';

import { useIncomeTaxCalculation, useMonthlyTaxInsights } from '@/lib/supabase/tax';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function TaxesPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: taxCalc, isLoading: loadingTaxCalc, error: taxCalcError } = useIncomeTaxCalculation(selectedYear);
  const { data: monthlyInsights, isLoading: loadingMonthly } = useMonthlyTaxInsights(selectedYear);

  // Generate available years (2025, 2026, etc.)
  const availableYears = [2025, 2026, 2027];

  if (loadingTaxCalc) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (taxCalcError) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-900 font-bold text-lg mb-2">Error Loading Tax Data</h2>
            <p className="text-red-700">
              {taxCalcError instanceof Error ? taxCalcError.message : 'An error occurred while loading tax data'}
            </p>
            <p className="text-red-600 text-sm mt-2">Check browser console for details.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!taxCalc) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No tax data available for {selectedYear}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tax Overview</h1>
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
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground min-w-[80px]">Select Year:</span>
              <div className="flex gap-2 flex-wrap">
                {availableYears.map((year) => {
                  const isCurrentYear = year === new Date().getFullYear();
                  const isSelected = selectedYear === year;
                  return (
                    <Button
                      key={year}
                      variant="outline"
                      onClick={() => setSelectedYear(year)}
                      className={`${isSelected ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : ''} ${isCurrentYear && !isSelected ? 'border-primary border-2' : ''} min-w-[100px]`}
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

        {/* Monthly Insights Section */}
        {monthlyInsights && monthlyInsights.summary && (
          <>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-blue-600 border-blue-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">Gemiddeld per Maand</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{monthlyInsights.summary.avg_monthly_profit.toFixed(0)}</p>
                  <p className="text-sm text-blue-100 mt-1">Winst (tot nu toe)</p>
                  <div className="mt-2 text-xs text-blue-100">
                    <div>Inkomen: €{monthlyInsights.summary.avg_monthly_revenue.toFixed(0)}</div>
                    <div>Uitgaven: €{monthlyInsights.summary.avg_monthly_expenses.toFixed(0)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-600 border-green-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">Belastingvrije Voet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{monthlyInsights.summary.monthly_deductions.toFixed(0)}</p>
                  <p className="text-sm text-green-100 mt-1">Gemiddeld per maand</p>
                  <div className="mt-2 text-xs text-green-100 space-y-0.5">
                    {monthlyInsights.summary.all_deductions.map((deduction, idx) => (
                      <div key={idx}>
                        {deduction.name}: €{deduction.monthly_amount.toFixed(0)}/mnd
                      </div>
                    ))}
                    <div className="mt-1 pt-1 border-t border-green-400 font-medium">
                      Totaal jaarlijks: €{(monthlyInsights.summary.monthly_deductions * 12).toFixed(0)}
                    </div>
                    <div className="text-green-200">
                      + MKB vrijstelling: {monthlyInsights.summary.mkb_percentage}% van winst
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-600 border-purple-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">YTD Totalen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{monthlyInsights.summary.ytd_profit.toFixed(0)}</p>
                  <p className="text-sm text-purple-100 mt-1">{monthlyInsights.summary.months_completed} maanden</p>
                  <div className="mt-2 text-xs text-purple-100">
                    <div>Inkomen: €{monthlyInsights.summary.ytd_revenue.toFixed(0)}</div>
                    <div>Uitgaven: €{monthlyInsights.summary.ytd_expenses.toFixed(0)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-600 border-orange-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">Geprojecteerd Jaar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{monthlyInsights.summary.projected_annual_profit.toFixed(0)}</p>
                  <p className="text-sm text-orange-100 mt-1">Totale winst</p>
                  <div className="mt-2 text-xs text-orange-100">
                    <div>Inkomen: €{monthlyInsights.summary.projected_annual_revenue.toFixed(0)}</div>
                    <div>Uitgaven: €{monthlyInsights.summary.projected_annual_expenses.toFixed(0)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-600 border-red-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm font-medium">Sparen voor Belasting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">€{monthlyInsights.summary.recommended_monthly_tax_savings.toFixed(0)}</p>
                  <p className="text-sm text-red-100 mt-1">Per maand opzij zetten</p>
                  <div className="mt-2 text-xs text-red-100">
                    <div>Totaal jaar: €{monthlyInsights.summary.projected_total_tax.toFixed(0)}</div>
                    <div>Effectief tarief: {monthlyInsights.summary.projected_effective_rate.toFixed(1)}%</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Maandelijks Overzicht {selectedYear}
                </CardTitle>
                <CardDescription>
                  Actuele cijfers t/m {new Date().toLocaleString('nl-NL', { month: 'long' })},
                  daarna geprojecteerd op basis van gemiddelde
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={monthlyInsights.months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month_name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => `€${value.toFixed(2)}`}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Inkomen"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stackId="2"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Uitgaven"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Winst"
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Legend for historical vs projected */}
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <span className="text-muted-foreground">Actueel (t/m {new Date().toLocaleString('nl-NL', { month: 'short' })})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-300 rounded"></div>
                    <span className="text-muted-foreground">Geprojecteerd</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax-Free Breakdown Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Maandelijkse Belastingvrije Breakdown</CardTitle>
                <CardDescription>Hoe je winst wordt verdeeld: belastbaar vs belastingvrij</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyInsights.months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month_name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => `€${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Bar dataKey="deductions" stackId="a" fill="#10b981" name="Aftrek (zelfstandigen/starter)" />
                    <Bar dataKey="mkb_exemption" stackId="a" fill="#84cc16" name="MKB Winstvrijstelling" />
                    <Bar dataKey="taxable_income" stackId="a" fill="#ef4444" name="Belastbaar Inkomen" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Maandelijkse Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Maand</th>
                        <th className="text-right p-2">Inkomen</th>
                        <th className="text-right p-2">Uitgaven</th>
                        <th className="text-right p-2">Winst</th>
                        <th className="text-right p-2">Aftrek</th>
                        <th className="text-right p-2">MKB Vrijst.</th>
                        <th className="text-right p-2">Belastbaar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyInsights.months.map((month) => (
                        <tr
                          key={month.month}
                          className={`border-b ${!month.is_historical ? 'bg-blue-50 italic' : ''}`}
                        >
                          <td className="p-2">
                            {month.month_name}
                            {!month.is_historical && <span className="ml-2 text-xs text-blue-600">(proj.)</span>}
                          </td>
                          <td className="text-right p-2 text-green-600">€{month.revenue.toFixed(0)}</td>
                          <td className="text-right p-2 text-red-600">€{month.expenses.toFixed(0)}</td>
                          <td className="text-right p-2 font-medium">€{month.profit.toFixed(0)}</td>
                          <td className="text-right p-2 text-green-600">€{month.deductions.toFixed(0)}</td>
                          <td className="text-right p-2 text-green-600">€{month.mkb_exemption.toFixed(0)}</td>
                          <td className="text-right p-2 font-bold text-red-600">€{month.taxable_income.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="p-2">Totaal</td>
                        <td className="text-right p-2 text-green-600">€{monthlyInsights.summary.projected_annual_revenue.toFixed(0)}</td>
                        <td className="text-right p-2 text-red-600">€{monthlyInsights.summary.projected_annual_expenses.toFixed(0)}</td>
                        <td className="text-right p-2">€{monthlyInsights.summary.projected_annual_profit.toFixed(0)}</td>
                        <td className="text-right p-2 text-green-600">€{(monthlyInsights.summary.monthly_deductions * 12).toFixed(0)}</td>
                        <td className="text-right p-2 text-green-600">-</td>
                        <td className="text-right p-2 text-red-600">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">€{taxCalc.gross_profit.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Revenue - Expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Taxable Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">€{taxCalc.taxable_income.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">After deductions</p>
            </CardContent>
          </Card>

          <Card className="bg-red-600 border-red-600">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Income Tax Owed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{taxCalc.total_income_tax.toFixed(2)}</p>
              <p className="text-sm text-red-100 mt-1">Effective: {taxCalc.effective_tax_rate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-green-600 border-green-600">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Net After Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{taxCalc.net_profit_after_tax.toFixed(2)}</p>
              <p className="text-sm text-green-100 mt-1">Your take-home</p>
            </CardContent>
          </Card>
        </div>

        {/* Income Tax Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Income Tax Calculation Breakdown</CardTitle>
            <CardDescription>Dutch tax brackets for {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Step 1: Gross Profit */}
              <div className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-medium text-foreground">Gross Profit</p>
                  <p className="text-sm text-muted-foreground">Total revenue minus expenses (excl. VAT)</p>
                </div>
                <p className="text-lg font-bold text-foreground">€{taxCalc.gross_profit.toFixed(2)}</p>
              </div>

              {/* Step 2: Deductions */}
              {((taxCalc.self_employed_deduction ?? 0) > 0 ||
                (taxCalc.startup_deduction ?? 0) > 0 ||
                taxCalc.custom_benefits.length > 0) && (
                <div className="bg-secondary p-4 rounded-lg space-y-2">
                  <p className="font-medium text-foreground">Deductions</p>
                  {(taxCalc.self_employed_deduction ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Zelfstandigenaftrek (Self-employed deduction)</span>
                      <span className="font-medium text-foreground">- €{taxCalc.self_employed_deduction.toFixed(2)}</span>
                    </div>
                  )}
                  {(taxCalc.startup_deduction ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Startersaftrek (Startup deduction)</span>
                      <span className="font-medium text-foreground">- €{taxCalc.startup_deduction.toFixed(2)}</span>
                    </div>
                  )}
                  {taxCalc.custom_benefits.map((benefit: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{benefit.name}</span>
                      <span className="font-medium text-foreground">- €{benefit.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: After Deductions */}
              <div className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-medium text-foreground">Profit After Deductions</p>
                </div>
                <p className="text-lg font-bold text-foreground">€{taxCalc.profit_after_deductions.toFixed(2)}</p>
              </div>

              {/* Step 4: MKB Exemption */}
              {(taxCalc.mkb_exemption_amount ?? 0) > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-green-900">MKB-winstvrijstelling (SME Profit Exemption)</p>
                      <p className="text-sm text-green-700">{taxCalc.mkb_profit_exemption}% of profit after deductions</p>
                    </div>
                    <span className="font-medium text-green-900">- €{taxCalc.mkb_exemption_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Step 5: Taxable Income */}
              <div className="flex justify-between items-center py-3 border-b border-foreground">
                <div>
                  <p className="font-bold text-foreground">Taxable Income</p>
                  <p className="text-sm text-muted-foreground">Amount subject to income tax</p>
                </div>
                <p className="text-xl font-bold text-foreground">€{taxCalc.taxable_income.toFixed(2)}</p>
              </div>

              {/* Tax Brackets */}
              {taxCalc.bracket_1_limit > 0 && (
                <div className="space-y-3 mt-6">
                  <p className="font-medium text-foreground">Tax Calculation by Bracket:</p>

                  {/* Bracket 1 */}
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-orange-900">Bracket 1 (up to €{taxCalc.bracket_1_limit.toLocaleString()})</span>
                      <span className="text-orange-700">{taxCalc.bracket_1_rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-700">Tax in this bracket</span>
                      <span className="font-bold text-orange-900">€{taxCalc.tax_bracket_1.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Bracket 2 */}
                  {(taxCalc.tax_bracket_2 ?? 0) > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-red-900">Bracket 2 (above €{taxCalc.bracket_1_limit.toLocaleString()})</span>
                        <span className="text-red-700">{taxCalc.bracket_2_rate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-700">Tax in this bracket</span>
                        <span className="font-bold text-red-900">€{taxCalc.tax_bracket_2.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tax Before Credits */}
              <div className="flex justify-between items-center py-4 bg-orange-100 rounded-lg px-4 mt-4">
                <div>
                  <p className="font-bold text-orange-900 text-lg">Tax Before Credits</p>
                  <p className="text-sm text-orange-700">Before heffingskortingen</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">€{taxCalc.total_income_tax_before_credits.toFixed(2)}</p>
              </div>

              {/* Tax Credits (Heffingskortingen) */}
              {((taxCalc.algemene_heffingskorting ?? 0) > 0 || (taxCalc.arbeidskorting ?? 0) > 0) && (
                <div className="bg-green-50 p-4 rounded-lg space-y-2 mt-4">
                  <p className="font-medium text-green-900">Tax Credits (Heffingskortingen)</p>
                  {(taxCalc.algemene_heffingskorting ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">Algemene heffingskorting</span>
                      <span className="font-medium text-green-900">- €{taxCalc.algemene_heffingskorting.toFixed(2)}</span>
                    </div>
                  )}
                  {(taxCalc.arbeidskorting ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">Arbeidskorting</span>
                      <span className="font-medium text-green-900">- €{taxCalc.arbeidskorting.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Final Tax */}
              <div className="flex justify-between items-center py-4 bg-red-100 rounded-lg px-4 mt-4">
                <div>
                  <p className="font-bold text-red-900 text-lg">Final Income Tax to Pay</p>
                  <p className="text-sm text-red-700">Effective rate: {taxCalc.effective_tax_rate.toFixed(2)}%</p>
                </div>
                <p className="text-2xl font-bold text-red-900">€{taxCalc.total_income_tax.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
