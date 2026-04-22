'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCompany } from '@/lib/supabase/companies';
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

export default function CreateCompanyPage() {
  const router = useRouter();
  const [type, setType] = useState<'client' | 'supplier' | 'both'>('client');

  const createCompany = useCreateCompany();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      type,
      name: formData.get('name') as string,
      main_contact_person: formData.get('main_contact_person') as string || null,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      street_address: formData.get('street_address') as string || null,
      postal_code: formData.get('postal_code') as string || null,
      city: formData.get('city') as string || null,
      country: formData.get('country') as string || null,
      btw_number: formData.get('btw_number') as string || null,
      kvk_number: formData.get('kvk_number') as string || null,
      iban: formData.get('iban') as string || null,
      notes: formData.get('notes') as string || null,
      is_active: true,
    };

    createCompany.mutate(data, {
      onSuccess: (result: any) => {
        toast.success('Company created successfully');
        router.push(`/companies/${result.id}`);
      },
      onError: (error: any) => {
        toast.error(`Failed to create company: ${error.message}`);
      },
    });
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/companies')}
            className="text-slate-600 hover:text-slate-900"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Create New Company</h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 bg-white p-6 rounded-lg border border-slate-200">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Company Type *</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="main_contact_person">Main Contact Person</Label>
              <Input id="main_contact_person" name="main_contact_person" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Address</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input id="street_address" name="street_address" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input id="postal_code" name="postal_code" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" defaultValue="Netherlands" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 my-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Details</h3>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="kvk_number">KVK Number</Label>
                    <Input id="kvk_number" name="kvk_number" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="btw_number">BTW Number</Label>
                    <Input id="btw_number" name="btw_number" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input id="iban" name="iban" placeholder="NL00 BANK 0000 0000 00" />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/companies')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-900 hover:bg-blue-800"
              disabled={createCompany.isPending}
            >
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
