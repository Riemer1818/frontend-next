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
  const [addBenefitDialogOpen, setAddBenefitDialogOpen] = useState(false);
  const [editBenefitDialogOpen, setEditBenefitDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<any>(null);
  const [newBenefit, setNewBenefit] = useState({
    benefit_type: '',
    name: '',
    description: '',
    amount: '',
    percentage: '',
    requires_hours_criterion: false,
    minimum_hours_required: '',
    eligibility_criteria: '',
    max_usage_count: '',
  });

  const { data: allConfigs, isLoading } = trpc.tax.getAllTaxConfigurations.useQuery();
  const { data: taxCredits } = trpc.tax.getTaxCredits.useQuery({
    year: Number(selectedYear),
  }, {
    enabled: !!selectedYear,
  });

  const utils = trpc.useUtils();

  const updateSettings = trpc.tax.updateUserTaxSettings.useMutation({
    onSuccess: () => {
      toast.success('Tax settings updated successfully');
      utils.tax.getAllTaxConfigurations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const toggleBenefit = trpc.tax.toggleBenefit.useMutation({
    onSuccess: () => {
      toast.success('Benefit updated');
      utils.tax.getAllTaxConfigurations.invalidate();
      utils.tax.getIncomeTaxCalculation.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to toggle benefit: ${error.message}`);
    },
  });

  const createCustomBenefit = trpc.tax.createCustomBenefit.useMutation({
    onSuccess: () => {
      toast.success('Custom benefit created');
      utils.tax.getAllTaxConfigurations.invalidate();
      setAddBenefitDialogOpen(false);
      setNewBenefit({
        benefit_type: '',
        name: '',
        description: '',
        amount: '',
        percentage: '',
        requires_hours_criterion: false,
        minimum_hours_required: '',
        eligibility_criteria: '',
        max_usage_count: '',
      });
    },
    onError: (error) => {
      toast.error(`Failed to create benefit: ${error.message}`);
    },
  });

  const updateBenefit = trpc.tax.updateBenefit.useMutation({
    onSuccess: () => {
      toast.success('Benefit updated');
      utils.tax.getAllTaxConfigurations.invalidate();
      utils.tax.getIncomeTaxCalculation.invalidate();
      setEditBenefitDialogOpen(false);
      setEditingBenefit(null);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteBenefit = trpc.tax.deleteBenefit.useMutation({
    onSuccess: () => {
      toast.success('Benefit deleted');
      utils.tax.getAllTaxConfigurations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

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

  const handleToggleBenefit = (benefitId: number, value: boolean) => {
    toggleBenefit.mutate({
      benefitId,
      isEnabled: value,
    });
  };

  const handleCreateBenefit = () => {
    if (!newBenefit.name || !newBenefit.benefit_type) {
      toast.error('Please fill in at least the name and benefit type');
      return;
    }

    createCustomBenefit.mutate({
      year: Number(selectedYear),
      benefit_type: newBenefit.benefit_type,
      name: newBenefit.name,
      description: newBenefit.description || undefined,
      amount: newBenefit.amount ? parseFloat(newBenefit.amount) : undefined,
      percentage: newBenefit.percentage ? parseFloat(newBenefit.percentage) : undefined,
      requires_hours_criterion: newBenefit.requires_hours_criterion,
      minimum_hours_required: newBenefit.minimum_hours_required ? parseInt(newBenefit.minimum_hours_required) : undefined,
      eligibility_criteria: newBenefit.eligibility_criteria || undefined,
      max_usage_count: newBenefit.max_usage_count ? parseInt(newBenefit.max_usage_count) : undefined,
    });
  };

  const handleEditBenefit = (benefit: any) => {
    setEditingBenefit({
      id: benefit.id,
      benefit_type: benefit.benefit_type,
      name: benefit.name,
      description: benefit.description || '',
      amount: benefit.amount?.toString() || '',
      percentage: benefit.percentage?.toString() || '',
      minimum_hours_required: benefit.minimum_hours_required?.toString() || '',
      eligibility_criteria: benefit.eligibility_criteria || '',
      max_usage_count: benefit.max_usage_count?.toString() || '',
    });
    setEditBenefitDialogOpen(true);
  };

  const handleUpdateBenefit = () => {
    if (!editingBenefit?.name) {
      toast.error('Name is required');
      return;
    }

    updateBenefit.mutate({
      benefitId: editingBenefit.id,
      name: editingBenefit.name,
      description: editingBenefit.description || undefined,
      amount: editingBenefit.amount ? parseFloat(editingBenefit.amount) : undefined,
      percentage: editingBenefit.percentage ? parseFloat(editingBenefit.percentage) : undefined,
      minimum_hours_required: editingBenefit.minimum_hours_required ? parseInt(editingBenefit.minimum_hours_required) : undefined,
      eligibility_criteria: editingBenefit.eligibility_criteria || undefined,
      max_usage_count: editingBenefit.max_usage_count ? parseInt(editingBenefit.max_usage_count) : undefined,
    });
  };

  const handleDeleteBenefit = (benefitId: number, benefitType: string) => {
    if (['zelfstandigenaftrek', 'startersaftrek', 'mkb_winstvrijstelling'].includes(benefitType)) {
      toast.error('Cannot delete core tax benefits');
      return;
    }

    if (confirm('Are you sure you want to delete this benefit? This action cannot be undone.')) {
      deleteBenefit.mutate({ benefitId });
      setEditBenefitDialogOpen(false);
      setEditingBenefit(null);
    }
  };

  const zelfstandigenBenefit2025 = allConfigs?.find(c => c.year.year === 2025)?.benefits.find(b => b.benefit_type === 'zelfstandigenaftrek');
  const zelfstandigenBenefit2026 = allConfigs?.find(c => c.year.year === 2026)?.benefits.find(b => b.benefit_type === 'zelfstandigenaftrek');
  const reduction = zelfstandigenBenefit2025 && zelfstandigenBenefit2026
    ? zelfstandigenBenefit2025.amount! - zelfstandigenBenefit2026.amount!
    : 0;

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">

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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-slate-900">Tax Benefits & Deductions ({config.year.year})</CardTitle>
                    <CardDescription>
                      Ondernemersaftrekposten - Select which benefits apply to your situation
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setAddBenefitDialogOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    + Add Custom Benefit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {config.benefits.map((benefit) => {
                    const isCoreBenefit = ['zelfstandigenaftrek', 'startersaftrek', 'mkb_winstvrijstelling'].includes(benefit.benefit_type);

                    return (
                      <div key={benefit.id} className="space-y-3">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            id={`benefit-${benefit.id}`}
                            checked={benefit.is_enabled}
                            onCheckedChange={(checked) =>
                              handleToggleBenefit(benefit.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`benefit-${benefit.id}`}
                                className="text-base font-medium text-slate-900 cursor-pointer"
                              >
                                {benefit.name}
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBenefit(benefit)}
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{benefit.description}</p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                              {benefit.minimum_hours_required && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Requires {benefit.minimum_hours_required} hours/year
                                </Badge>
                              )}
                              {benefit.max_usage_count && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Max {benefit.max_usage_count}x usage
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

            {/* Tax Credits */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Tax Credits / Heffingskortingen ({config.year.year})</CardTitle>
                <CardDescription>
                  Tax credits that reduce your payable tax after calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {taxCredits?.credits && taxCredits.credits.length > 0 ? (
                  <div className="space-y-6">
                    {taxCredits.credits.map((credit) => (
                      <div key={credit.id} className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-base font-medium text-slate-900">
                                {credit.name}
                              </p>
                              <Badge className={credit.is_enabled ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                                {credit.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            {credit.description && (
                              <p className="text-sm text-slate-600 mt-1">{credit.description}</p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {credit.max_amount && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Max €{credit.max_amount.toLocaleString()}
                                </Badge>
                              )}
                              {credit.phaseout_start && credit.phaseout_end && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Phaseout: €{credit.phaseout_start.toLocaleString()} - €{credit.phaseout_end.toLocaleString()}
                                </Badge>
                              )}
                              {credit.phaseout_rate && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  {credit.phaseout_rate}% reduction per €1000 above threshold
                                </Badge>
                              )}
                            </div>

                            {/* Show arbeidskorting brackets if this is arbeidskorting */}
                            {credit.credit_type === 'arbeidskorting' && taxCredits.arbeidskorting_brackets && taxCredits.arbeidskorting_brackets.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-slate-700">Income Brackets:</p>
                                <div className="space-y-1">
                                  {taxCredits.arbeidskorting_brackets.map((bracket) => (
                                    <div
                                      key={bracket.bracket_order}
                                      className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs"
                                    >
                                      <span className="text-slate-600">
                                        €{bracket.income_from.toLocaleString()} - {bracket.income_to ? `€${bracket.income_to.toLocaleString()}` : '∞'}
                                      </span>
                                      <span className="text-slate-900 font-medium">
                                        {bracket.rate && bracket.rate !== 0 ? `${bracket.rate}%` : ''}
                                        {bracket.base_amount && ` (base: €${bracket.base_amount.toLocaleString()})`}
                                        {bracket.rate_applies_to_excess && ' on excess'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No tax credits configured for {config.year.year}</p>
                )}
              </CardContent>
            </Card>

              </TabsContent>
            );
          })}
        </Tabs>

        {/* Add Custom Benefit Dialog */}
        <Dialog open={addBenefitDialogOpen} onOpenChange={setAddBenefitDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Custom Tax Benefit for {selectedYear}</DialogTitle>
              <DialogDescription>
                Create a custom tax benefit or deduction that applies to your situation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Benefit Type */}
              <div className="space-y-2">
                <Label htmlFor="benefit_type">Benefit Type ID <span className="text-red-500">*</span></Label>
                <Input
                  id="benefit_type"
                  placeholder="e.g., research_deduction, green_investment_credit"
                  value={newBenefit.benefit_type}
                  onChange={(e) => setNewBenefit({ ...newBenefit, benefit_type: e.target.value })}
                />
                <p className="text-xs text-slate-500">A unique identifier for this benefit (lowercase, underscores only)</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Research & Development Deduction"
                  value={newBenefit.name}
                  onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief explanation of this benefit"
                  value={newBenefit.description}
                  onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                />
              </div>

              {/* Amount or Percentage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Fixed Amount (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g., 1500"
                    value={newBenefit.amount}
                    onChange={(e) => setNewBenefit({ ...newBenefit, amount: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Fixed euro amount deduction</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    placeholder="e.g., 14"
                    value={newBenefit.percentage}
                    onChange={(e) => setNewBenefit({ ...newBenefit, percentage: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Percentage exemption</p>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">Eligibility Requirements</p>

                <div className="space-y-2">
                  <Label htmlFor="minimum_hours">Minimum Hours Required (optional)</Label>
                  <Input
                    id="minimum_hours"
                    type="number"
                    placeholder="e.g., 500 for WBSO, 1225 for zelfstandigenaftrek"
                    value={newBenefit.minimum_hours_required}
                    onChange={(e) => setNewBenefit({ ...newBenefit, minimum_hours_required: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Minimum hours per year required to qualify</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eligibility_criteria">Eligibility Criteria (optional)</Label>
                  <Input
                    id="eligibility_criteria"
                    placeholder="e.g., Must perform R&D activities, Self-employed status required"
                    value={newBenefit.eligibility_criteria}
                    onChange={(e) => setNewBenefit({ ...newBenefit, eligibility_criteria: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Free-text description of requirements</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_usage">Maximum Usage Count (optional)</Label>
                  <Input
                    id="max_usage"
                    type="number"
                    placeholder="e.g., 3"
                    value={newBenefit.max_usage_count}
                    onChange={(e) => setNewBenefit({ ...newBenefit, max_usage_count: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">How many times this benefit can be used</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setAddBenefitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBenefit}
                disabled={!newBenefit.name || !newBenefit.benefit_type}
              >
                Create Benefit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Benefit Dialog */}
        <Dialog open={editBenefitDialogOpen} onOpenChange={setEditBenefitDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Tax Benefit</DialogTitle>
              <DialogDescription>
                Update the details of this tax benefit or deduction.
              </DialogDescription>
            </DialogHeader>

            {editingBenefit && (
              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Display Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit_name"
                    placeholder="e.g., Research & Development Deduction"
                    value={editingBenefit.name}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, name: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    placeholder="Brief explanation of this benefit"
                    value={editingBenefit.description}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, description: e.target.value })}
                  />
                </div>

                {/* Amount or Percentage */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_amount">Fixed Amount (€)</Label>
                    <Input
                      id="edit_amount"
                      type="number"
                      placeholder="e.g., 1500"
                      value={editingBenefit.amount}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_percentage">Percentage (%)</Label>
                    <Input
                      id="edit_percentage"
                      type="number"
                      placeholder="e.g., 14"
                      value={editingBenefit.percentage}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, percentage: e.target.value })}
                    />
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium text-slate-700">Eligibility Requirements</p>

                  <div className="space-y-2">
                    <Label htmlFor="edit_minimum_hours">Minimum Hours Required</Label>
                    <Input
                      id="edit_minimum_hours"
                      type="number"
                      placeholder="e.g., 500 for WBSO, 1225 for zelfstandigenaftrek"
                      value={editingBenefit.minimum_hours_required}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, minimum_hours_required: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_eligibility_criteria">Eligibility Criteria</Label>
                    <Input
                      id="edit_eligibility_criteria"
                      placeholder="e.g., Must perform R&D activities"
                      value={editingBenefit.eligibility_criteria}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, eligibility_criteria: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_max_usage">Maximum Usage Count</Label>
                    <Input
                      id="edit_max_usage"
                      type="number"
                      placeholder="e.g., 3"
                      value={editingBenefit.max_usage_count}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, max_usage_count: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              {editingBenefit && !['zelfstandigenaftrek', 'startersaftrek', 'mkb_winstvrijstelling'].includes(editingBenefit.benefit_type) ? (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteBenefit(editingBenefit.id, editingBenefit.benefit_type)}
                >
                  Delete Benefit
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditBenefitDialogOpen(false);
                    setEditingBenefit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateBenefit}
                  disabled={!editingBenefit?.name}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
