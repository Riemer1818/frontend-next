'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ContactsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const { data: contacts, isLoading, refetch } = trpc.contact.getAllWithCompany.useQuery();
  const { data: companies } = trpc.company.getAll.useQuery({ type: 'client', isActive: true });

  const createContact = trpc.contact.create.useMutation({
    onSuccess: () => {
      toast.success('Contact created successfully');
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const deleteContact = trpc.contact.delete.useMutation({
    onSuccess: () => {
      toast.success('Contact deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });

  const setPrimary = trpc.contact.setPrimary.useMutation({
    onSuccess: () => {
      toast.success('Primary contact updated');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to set primary: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const companyIdStr = formData.get('company_id') as string;
    const data: any = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      role: formData.get('role') as string || undefined,
      description: formData.get('description') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      is_primary: formData.get('is_primary') === 'on',
      is_active: true,
    };

    // Only add company_id if provided
    if (companyIdStr && companyIdStr !== '') {
      data.company_id = parseInt(companyIdStr);
    }

    createContact.mutate(data);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteContact.mutate({ id });
    }
  };

  const handleSetPrimary = (id: number) => {
    setPrimary.mutate({ id });
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
            <p className="text-slate-600 mt-1">Manage people within your companies</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Create a new contact (optionally linked to a company)
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input id="first_name" name="first_name" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" name="last_name" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input id="description" name="description" placeholder="e.g. Accountant, Developer, Friend..." />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company_id">Company (Optional)</Label>
                    <Select name="company_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company (optional)" />
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

                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" name="role" placeholder="e.g. CEO, CFO, Manager" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_primary"
                      name="is_primary"
                      className="rounded border-slate-300"
                    />
                    <Label htmlFor="is_primary" className="cursor-pointer">
                      Set as primary contact (if company selected)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-900 hover:bg-blue-800"
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? 'Creating...' : 'Create Contact'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p className="text-slate-500">Loading contacts...</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-slate-900 font-semibold">Name</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Description</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Company</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Email</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Phone</TableHead>
                  <TableHead className="text-right text-slate-900 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      No contacts found. Create your first contact to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts?.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/contacts/${contact.id}`}>
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link href={`/contacts/${contact.id}`} className="text-blue-900 hover:underline">
                              {contact.first_name} {contact.last_name}
                            </Link>
                            {contact.is_primary && (
                              <Badge variant="default" className="bg-blue-900 text-white text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          {contact.role && (
                            <span className="text-xs text-slate-500">{contact.role}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{contact.description || '—'}</TableCell>
                      <TableCell className="text-slate-700">
                        {contact.company_name || '—'}
                      </TableCell>
                      <TableCell className="text-slate-700">{contact.email || '—'}</TableCell>
                      <TableCell className="text-slate-700">{contact.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!contact.is_primary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-900 hover:bg-slate-100"
                              onClick={() => handleSetPrimary(contact.id)}
                              disabled={setPrimary.isPending}
                            >
                              Set Primary
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(contact.id, `${contact.first_name} ${contact.last_name}`)}
                            disabled={deleteContact.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
