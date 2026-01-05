'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';
import { AlertCircle, Info, Edit, ArrowDownCircle } from 'lucide-react';

export default function TaxConfigPage() {
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: allConfigs, isLoading } = trpc.tax.getAllTaxConfigurations.useQuery();
  const updateSettings = trpc.tax.updateUserTaxSettings.useMutation({
    onSuccess: () => {
      toast.success('Tax settings updated successfully');
      utils.tax.getAllTaxConfigurations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const currentConfig = allConfigs?.find(c => c.year.year === Number(selectedYear));

  const handleToggleBenefit = (benefitType: string, value: boolean) => {
    if (!currentConfig) return;

    const settings = currentConfig.userSettings || {
      applies_zelfstandigenaftrek: false,
      applies_startersaftrek: false,
      applies_mkb_winstvrijstelling: false,
    };

    updateSettings.mutate({
      year: Number(selectedYear),
      applies_zelfstandigenaftrek: benefitType === 'zelfstandigenaftrek' ? value : settings.applies_zelfstandigenaftrek,
      applies_startersaftrek: benefitType === 'startersaftrek' ? value : settings.applies_startersaftrek,
      applies_mkb_winstvrijstelling: benefitType === 'mkb_winstvrijstelling' ? value : settings.applies_mkb_winstvrijstelling,
    });
  };

  const zelfstandigenBenefit2025 = allConfigs?.find(c => c.year.year === 2025)?.benefits.find(b => b.benefit_type === 'zelfstandigenaftrek');
  const zelfstandigenBenefit2026 = allConfigs?.find(c => c.year.year === 2026)?.benefits.find(b => b.benefit_type === 'zelfstandigenaftrek');
  const reduction = zelfstandigenBenefit2025 && zelfstandigenBenefit2026
    ? zelfstandigenBenefit2025.amount! - zelfstandigenBenefit2026.amount!
    : 0;

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Configuration</h1>
          <p className="text-slate-600 mt-1">
            Manage your tax benefits and view tax brackets for different years
          </p>
        </div>

        {/* Year Tabs */}
        <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            {allConfigs?.map((config) => (
              <TabsTrigger
                key={config.year.year}
                value={String(config.year.year)}
                className="text-base font-medium"
              >
                {config.year.year}
              </TabsTrigger>
            ))}
          </TabsList>

          {allConfigs?.map((config) => {
            const isCurrentConfig = config.year.year === Number(selectedYear);
            if (!isCurrentConfig) return null;

            return (
              <TabsContent key={config.year.year} value={String(config.year.year)} className="space-y-6 mt-6">
                {/* Tax Brackets */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Income Tax Brackets ({config.year.year})</CardTitle>
                <CardDescription>Inkomstenbelasting schijven</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {config.brackets.map((bracket) => (
                    <div
                      key={bracket.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          Bracket {bracket.bracket_order}
                        </p>
                        <p className="text-sm text-slate-600">
                          €{bracket.income_from.toLocaleString()} - {bracket.income_to ? `€${bracket.income_to.toLocaleString()}` : 'unlimited'}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                        {bracket.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tax Benefits */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Tax Benefits & Deductions ({config.year.year})</CardTitle>
                <CardDescription>
                  Ondernemersaftrekposten - Select which benefits apply to your situation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {config.benefits.map((benefit) => {
                    const isApplied = config.userSettings
                      ? config.userSettings[`applies_${benefit.benefit_type}` as keyof typeof config.userSettings]
                      : false;

                    return (
                      <div key={benefit.id} className="space-y-3">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            id={`benefit-${benefit.id}`}
                            checked={isApplied}
                            onCheckedChange={(checked) =>
                              handleToggleBenefit(benefit.benefit_type, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`benefit-${benefit.id}`}
                              className="text-base font-medium text-slate-900 cursor-pointer"
                            >
                              {benefit.name}
                            </Label>
                            <p className="text-sm text-slate-600 mt-1">{benefit.description}</p>

                            <div className="mt-2 flex items-center gap-4">
                              {benefit.amount && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  €{benefit.amount.toLocaleString()} deduction
                                </Badge>
                              )}
                              {benefit.percentage && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {benefit.percentage}% exemption
                                </Badge>
                              )}
                              {benefit.requires_hours_criterion && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Requires 1,225 hours/year
                                </Badge>
                              )}
                              {benefit.max_usage_count && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Max {benefit.max_usage_count}x in first 5 years
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

              </TabsContent>
            );
          })}
        </Tabs>

      </div>
    </MainLayout>
  );
}
