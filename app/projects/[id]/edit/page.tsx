'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);

  const { data: project, isLoading } = trpc.project.getById.useQuery({ id: projectId });
  const { data: companies } = trpc.company.getAll.useQuery({ type: 'client', isActive: true });

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    description: '',
    hourly_rate: '',
    status: 'active',
    start_date: '',
    end_date: '',
    color: '#1e3a8a',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        client_id: project.client_id?.toString() || '',
        description: project.description || '',
        hourly_rate: project.hourly_rate?.toString() || '',
        status: project.status || 'active',
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
        color: project.color || '#1e3a8a',
      });
    }
  }, [project]);

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success('Project updated successfully');
      router.push(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const clientId = formData.client_id ? parseInt(formData.client_id) : undefined;
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }

    updateMutation.mutate({
      id: projectId,
      data: {
        name: formData.name,
        client_id: clientId,
        description: formData.description || undefined,
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        status: formData.status as 'active' | 'completed' | 'on_hold' | 'cancelled',
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        color: formData.color,
        tax_rate_id: 1, // Default tax rate
      },
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading project...</p>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Project not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 min-h-screen">
        <div>
          <Link href={`/projects/${projectId}`} className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
            ← Back to Project
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Edit Project</h1>
          <p className="text-slate-600 mt-1">Update project details</p>
        </div>

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-900">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    className="text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-slate-900">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => handleChange('client_id', value)}
                  >
                    <SelectTrigger className="text-slate-900">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate" className="text-slate-900">Hourly Rate (€)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => handleChange('hourly_rate', e.target.value)}
                    className="text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-900">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-slate-900">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-slate-900">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color" className="text-slate-900">Project Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-900">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  placeholder="Project description..."
                  className="text-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
