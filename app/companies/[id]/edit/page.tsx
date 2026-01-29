'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = parseInt(params.id as string);

  const { data: company, isLoading } = trpc.company.getById.useQuery({ id: companyId });

  const [formData, setFormData] = useState({
    name: '',
    type: 'client' as 'client' | 'supplier' | 'both',
    email: '',
    phone: '',
    street_address: '',
    postal_code: '',
    city: '',
    country: '',
    kvk_number: '',
    vat_number: '',
    iban: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        type: company.type || 'client',
        email: company.email || '',
        phone: company.phone || '',
        street_address: company.street_address || '',
        postal_code: company.postal_code || '',
        city: company.city || '',
        country: company.country || '',
        kvk_number: company.kvk_number || '',
        vat_number: company.vat_number || '',
        iban: company.iban || '',
        notes: company.notes || '',
        is_active: company.is_active ?? true,
      });
    }
  }, [company]);

  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      router.push(`/companies/${companyId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: companyId,
      data: formData,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Company not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div>
          <Link href={`/companies/${companyId}`} className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
            ← Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Edit Company</h1>
          <p className="text-slate-600 mt-1">Update company information</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-1">Company Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-slate-900 mb-1">Type *</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
                    required
                  >
                    <option value="client">Client</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-900">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-900">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="street_address" className="text-slate-900">Street Address</Label>
                  <Input
                    id="street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code" className="text-slate-900">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="city" className="text-slate-900">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="country" className="text-slate-900">Country</Label>
                  <Select
                    value={formData.country || 'Netherlands'}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                      <SelectItem value="Germany">🇩🇪 Germany (EU)</SelectItem>
                      <SelectItem value="Belgium">🇧🇪 Belgium (EU)</SelectItem>
                      <SelectItem value="France">🇫🇷 France (EU)</SelectItem>
                      <SelectItem value="United Kingdom">🇬🇧 United Kingdom (non-EU)</SelectItem>
                      <SelectItem value="United States">🇺🇸 United States (non-EU)</SelectItem>
                      <SelectItem value="Switzerland">🇨🇭 Switzerland (non-EU)</SelectItem>
                      <SelectItem value="Singapore">🇸🇬 Singapore (non-EU)</SelectItem>
                      <SelectItem value="Japan">🇯🇵 Japan (non-EU)</SelectItem>
                      <SelectItem value="Other EU">🇪🇺 Other EU Country</SelectItem>
                      <SelectItem value="Other non-EU">🌍 Other non-EU Country</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="kvk_number" className="text-slate-900">KVK Number</Label>
                  <Input
                    id="kvk_number"
                    value={formData.kvk_number}
                    onChange={(e) => setFormData({ ...formData, kvk_number: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="vat_number" className="text-slate-900">VAT Number</Label>
                  <Input
                    id="vat_number"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="iban" className="text-slate-900">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    className="mt-1 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes" className="text-slate-900">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 text-slate-900"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-900">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-900 hover:bg-slate-100"
                  onClick={() => router.push(`/companies/${companyId}`)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
