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

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = parseInt(params.id as string);

  const { data: contact, isLoading } = trpc.contact.getById.useQuery({ id: contactId });
  const { data: companies } = trpc.company.getAll.useQuery();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_id: '',
    role: '',
    description: '',
    email: '',
    phone: '',
    is_primary: false,
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        company_id: contact.company_id?.toString() || 'none',
        role: contact.role || '',
        description: contact.description || '',
        email: contact.email || '',
        phone: contact.phone || '',
        is_primary: contact.is_primary || false,
        is_active: contact.is_active ?? true,
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  const updateMutation = trpc.contact.update.useMutation({
    onSuccess: () => {
      toast.success('Contact updated successfully');
      router.push(`/contacts/${contactId}`);
    },
    onError: (error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      first_name: formData.first_name,
      last_name: formData.last_name || undefined,
      role: formData.role || undefined,
      description: formData.description || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      is_primary: formData.is_primary,
      is_active: formData.is_active,
      notes: formData.notes || undefined,
    };

    // Only add company_id if provided and not "none"
    if (formData.company_id && formData.company_id !== '' && formData.company_id !== 'none') {
      data.company_id = parseInt(formData.company_id);
    }

    updateMutation.mutate({
      id: contactId,
      data,
    });
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading contact...</p>
        </div>
      </MainLayout>
    );
  }

  if (!contact) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Contact not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 min-h-screen">
        <div>
          <Link href={`/contacts/${contactId}`} className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
            ← Back to Contact
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Edit Contact</h1>
          <p className="text-slate-600 mt-1">Update contact details</p>
        </div>

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="e.g. Accountant, Developer, Friend..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_id">Primary Company (Optional)</Label>
                  <p className="text-xs text-slate-500">
                    Currently single company only. Multi-company associations coming soon.
                  </p>
                  <Select
                    value={formData.company_id}
                    onValueChange={(value) => handleChange('company_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="e.g. CEO, CFO, Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? "true" : "false"}
                    onValueChange={(value) => handleChange('is_active', value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => handleChange('is_primary', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="is_primary" className="cursor-pointer">
                    Set as primary contact (if company selected)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Additional notes..."
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
                  onClick={() => router.push(`/contacts/${contactId}`)}
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
