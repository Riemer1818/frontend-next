'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateProject } from '@/lib/supabase/projects';
import { useCompanies } from '@/lib/supabase/companies';
import { useTaxRates } from '@/lib/supabase/reporting';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function CreateProjectPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState<number | null>(null);
  const [taxRateId, setTaxRateId] = useState<number | null>(null);
  const [status, setStatus] = useState<'active' | 'completed' | 'on_hold' | 'cancelled'>('active');

  const { data: allCompanies = [] } = useCompanies();
  const clients = allCompanies.filter(c => c.type === 'client' || c.type === 'both');
  const { data: taxRates = [] } = useTaxRates();

  const createProject = useCreateProject();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!clientId) {
      toast.error('Please select a client');
      return;
    }

    if (!taxRateId) {
      toast.error('Please select a tax rate');
      return;
    }

    const data: any = {
      name: formData.get('name') as string,
      client_id: clientId,
      description: formData.get('description') as string || null,
      hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
      tax_rate_id: taxRateId,
      status,
      start_date: formData.get('start_date') as string || null,
      end_date: formData.get('end_date') as string || null,
      currency: 'EUR',
      color: formData.get('color') as string || '#1e3a8a',
    };

    createProject.mutate(data, {
      onSuccess: (result: any) => {
        toast.success('Project created successfully');
        router.push(`/projects/${result.id}`);
      },
      onError: (error: any) => {
        toast.error(`Failed to create project: ${error.message}`);
      },
    });
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="text-slate-600 hover:text-slate-900"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Create New Project</h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 bg-white p-6 rounded-lg border border-slate-200">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select value={clientId.toString()} onValueChange={(value) => setClientId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {(clients || []).map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString() ?? ''}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="hourly_rate">Hourly Rate (EUR) *</Label>
                  <Input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="0"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tax_rate_id">Tax Rate *</Label>
                  <Select value={taxRateId.toString()} onValueChange={(value) => setTaxRateId(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRates.map((taxRate: any) => (
                        <SelectItem key={taxRate.id} value={taxRate.id.toString()}>
                          {taxRate.name} ({taxRate.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" name="start_date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" name="end_date" type="date" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Appearance</h3>

              <div className="grid gap-2">
                <Label htmlFor="color">Project Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue="#1e3a8a"
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-slate-500">Choose a color to identify this project</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-900 hover:bg-blue-800"
              disabled={createProject.isPending}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
