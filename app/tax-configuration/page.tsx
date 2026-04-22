'use client';

import {
  useAllTaxConfigurations,
  useTaxCreditsWithBrackets,
  useToggleBenefit,
  useCreateCustomBenefit,
  useUpdateBenefit,
  useDeleteBenefit,
} from '@/lib/supabase/tax';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';
import { AlertCircle, Edit } from 'lucide-react';

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
    minimum_hours_required: '',
    eligibility_criteria: '',
    max_usage_count: '',
  });

  const { data: allConfigs, isLoading } = useAllTaxConfigurations();
  const { data: taxCreditsData } = useTaxCreditsWithBrackets(Number(selectedYear));

  const toggleBenefit = useToggleBenefit();
  const createCustomBenefit = useCreateCustomBenefit();
  const updateBenefit = useUpdateBenefit();
  const deleteBenefit = useDeleteBenefit();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const currentConfig = allConfigs?.find((c: any) => c.year.year === Number(selectedYear));

  const handleToggleBenefit = (benefitId: number, value: boolean) => {
    toggleBenefit.mutate(
      { benefitId, enabled: value },
      {
        onSuccess: () => toast.success('Benefit updated'),
        onError: (error: any) => toast.error(`Failed to toggle benefit: ${error.message}`),
      }
    );
  };

  const handleCreateBenefit = () => {
    if (!newBenefit.name || !newBenefit.benefit_type) {
      toast.error('Please fill in at least the name and benefit type');
      return;
    }

    const taxYearId = currentConfig?.year?.id;
    if (!taxYearId) {
      toast.error('No tax year selected');
      return;
    }

    createCustomBenefit.mutate(
      {
        taxYearId,
        name: newBenefit.name,
        benefitType: newBenefit.benefit_type,
        amount: newBenefit.amount ? parseFloat(newBenefit.amount) : undefined,
        percentage: newBenefit.percentage ? parseFloat(newBenefit.percentage) : undefined,
        description: newBenefit.description || undefined,
        minimumHoursRequired: newBenefit.minimum_hours_required ? parseInt(newBenefit.minimum_hours_required) : undefined,
        eligibilityCriteria: newBenefit.eligibility_criteria || undefined,
        maxUsageCount: newBenefit.max_usage_count ? parseInt(newBenefit.max_usage_count) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Custom benefit created');
          setAddBenefitDialogOpen(false);
          setNewBenefit({
            benefit_type: '',
            name: '',
            description: '',
            amount: '',
            percentage: '',
            minimum_hours_required: '',
            eligibility_criteria: '',
            max_usage_count: '',
          });
        },
        onError: (error: any) => toast.error(`Failed to create benefit: ${error.message}`),
      }
    );
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
    if (!editingBenefit.name) {
      toast.error('Name is required');
      return;
    }

    updateBenefit.mutate(
      {
        benefitId: editingBenefit.id,
        name: editingBenefit.name,
        description: editingBenefit.description || undefined,
        amount: editingBenefit.amount ? parseFloat(editingBenefit.amount) : undefined,
        percentage: editingBenefit.percentage ? parseFloat(editingBenefit.percentage) : undefined,
        minimumHoursRequired: editingBenefit.minimum_hours_required ? parseInt(editingBenefit.minimum_hours_required) : undefined,
        eligibilityCriteria: editingBenefit.eligibility_criteria || undefined,
        maxUsageCount: editingBenefit.max_usage_count ? parseInt(editingBenefit.max_usage_count) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Benefit updated');
          setEditBenefitDialogOpen(false);
          setEditingBenefit(null);
        },
        onError: (error: any) => toast.error(`Failed to update: ${error.message}`),
      }
    );
  };

  const handleDeleteBenefit = (benefitId: number, benefitType: string) => {
    if (['zelfstandigenaftrek', 'startersaftrek', 'mkb_winstvrijstelling'].includes(benefitType)) {
      toast.error('Cannot delete core tax benefits');
      return;
    }

    if (confirm('Are you sure you want to delete this benefit? This action cannot be undone.')) {
      deleteBenefit.mutate(
        { benefitId },
        {
          onSuccess: () => {
            toast.success('Benefit deleted');
            setEditBenefitDialogOpen(false);
            setEditingBenefit(null);
          },
          onError: (error: any) => toast.error(`Failed to delete: ${error.message}`),
        }
      );
    }
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tax Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure tax brackets, benefits, and credits</p>
        </div>

        {/* Year Tabs */}
        <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            {allConfigs?.map((config: any) => (
              <TabsTrigger
                key={config.year.year}
                value={String(config.year.year)}
                className="text-base font-medium"
              >
                {config.year.year}
              </TabsTrigger>
            ))}
          </TabsList>

          {allConfigs?.map((config: any) => {
            const isCurrentConfig = config.year.year === Number(selectedYear);
            if (!isCurrentConfig) return null;

            return (
              <TabsContent key={config.year.year} value={String(config.year.year)} className="space-y-6 mt-6">
                {/* Tax Brackets */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Income Tax Brackets ({config.year.year})</CardTitle>
                    <CardDescription>Inkomstenbelasting schijven</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {config.brackets?.map((bracket: any) => (
                        <div
                          key={bracket.id}
                          className="flex items-center justify-between p-4 bg-background rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              Bracket {bracket.bracket_order}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              €{bracket.income_from.toLocaleString()} - {bracket.income_to ? `€${bracket.income_to.toLocaleString()}` : 'unlimited'}
                            </p>
                          </div>
                          <Badge className="bg-secondary text-foreground text-lg px-4 py-2">
                            {bracket.rate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Benefits */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-foreground">Tax Benefits & Deductions ({config.year.year})</CardTitle>
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
                      {config.benefits?.map((benefit: any) => (
                        <div key={benefit.id} className="space-y-3">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              id={`benefit-${benefit.id}`}
                              checked={benefit.is_active}
                              onCheckedChange={(checked) =>
                                handleToggleBenefit(benefit.id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={`benefit-${benefit.id}`}
                                  className="text-base font-medium text-foreground cursor-pointer"
                                >
                                  {benefit.name}
                                </Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditBenefit(benefit)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-background"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{benefit.description}</p>

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
                                  <Badge variant="outline" className="bg-secondary text-foreground border-border">
                                    Max {benefit.max_usage_count}x usage
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Separator />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Credits */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Tax Credits / Heffingskortingen ({config.year.year})</CardTitle>
                    <CardDescription>
                      Tax credits that reduce your payable tax after calculation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {taxCreditsData?.credits && taxCreditsData.credits.length > 0 ? (
                      <div className="space-y-6">
                        {taxCreditsData.credits?.map((credit: any) => (
                          <div key={credit.id} className="space-y-3">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-base font-medium text-foreground">
                                    {credit.name}
                                  </p>
                                  <Badge className={credit.is_enabled ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground"}>
                                    {credit.is_enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </div>
                                {credit.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{credit.description}</p>
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
                                {credit.credit_type === 'arbeidskorting' && taxCreditsData?.arbeidskorting_brackets && taxCreditsData.arbeidskorting_brackets.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium text-foreground">Income Brackets:</p>
                                    <div className="space-y-1">
                                      {taxCreditsData.arbeidskorting_brackets?.map((bracket: any) => (
                                        <div
                                          key={bracket.bracket_order}
                                          className="flex items-center justify-between p-2 bg-background rounded text-xs"
                                        >
                                          <span className="text-muted-foreground">
                                            €{bracket.income_from.toLocaleString()} - {bracket.income_to ? `€${bracket.income_to.toLocaleString()}` : '∞'}
                                          </span>
                                          <span className="text-foreground font-medium">
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
                      <p className="text-sm text-muted-foreground">No tax credits configured for {config.year.year}</p>
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
              <div className="space-y-2">
                <Label htmlFor="benefit_type">Benefit Type ID <span className="text-red-500">*</span></Label>
                <Input
                  id="benefit_type"
                  placeholder="e.g., research_deduction"
                  value={newBenefit.benefit_type}
                  onChange={(e) => setNewBenefit({ ...newBenefit, benefit_type: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Research & Development Deduction"
                  value={newBenefit.name}
                  onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief explanation of this benefit"
                  value={newBenefit.description}
                  onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                />
              </div>

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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_hours">Minimum Hours Required</Label>
                <Input
                  id="minimum_hours"
                  type="number"
                  placeholder="e.g., 1225"
                  value={newBenefit.minimum_hours_required}
                  onChange={(e) => setNewBenefit({ ...newBenefit, minimum_hours_required: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility_criteria">Eligibility Criteria</Label>
                <Input
                  id="eligibility_criteria"
                  placeholder="e.g., Self-employed status required"
                  value={newBenefit.eligibility_criteria}
                  onChange={(e) => setNewBenefit({ ...newBenefit, eligibility_criteria: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_usage">Maximum Usage Count</Label>
                <Input
                  id="max_usage"
                  type="number"
                  placeholder="e.g., 3"
                  value={newBenefit.max_usage_count}
                  onChange={(e) => setNewBenefit({ ...newBenefit, max_usage_count: e.target.value })}
                />
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
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Display Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit_name"
                    value={editingBenefit.name}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    value={editingBenefit.description}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_amount">Fixed Amount (€)</Label>
                    <Input
                      id="edit_amount"
                      type="number"
                      value={editingBenefit.amount}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_percentage">Percentage (%)</Label>
                    <Input
                      id="edit_percentage"
                      type="number"
                      value={editingBenefit.percentage}
                      onChange={(e) => setEditingBenefit({ ...editingBenefit, percentage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_minimum_hours">Minimum Hours Required</Label>
                  <Input
                    id="edit_minimum_hours"
                    type="number"
                    value={editingBenefit.minimum_hours_required}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, minimum_hours_required: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_eligibility_criteria">Eligibility Criteria</Label>
                  <Input
                    id="edit_eligibility_criteria"
                    value={editingBenefit.eligibility_criteria}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, eligibility_criteria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_max_usage">Maximum Usage Count</Label>
                  <Input
                    id="edit_max_usage"
                    type="number"
                    value={editingBenefit.max_usage_count}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, max_usage_count: e.target.value })}
                  />
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
