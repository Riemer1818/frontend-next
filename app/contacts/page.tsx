'use client';

import { useState } from 'react';
import { useContactsWithCompany, useCreateContact, useDeleteContact, useSetPrimaryContact } from '@/lib/supabase/contacts';
import { useCompanies } from '@/lib/supabase/companies';
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
import { ClickableTableRow } from '@/components/ui/clickable-table-row';
import { ROUTES } from '@/lib/routes';

export default function ContactsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const { data: contacts, isLoading, error, refetch } = useContactsWithCompany();
  const { data: companies } = useCompanies();

  const createContact = useCreateContact();

  const deleteContact = useDeleteContact();

  const setPrimary = useSetPrimaryContact();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const companyIdStr = formData.get('company_id') as string;
    const data: any = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string || null,
      role: formData.get('role') as string || null,
      description: formData.get('description') as string || null,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      is_primary: formData.get('is_primary') === 'on',
      is_active: true,
    };

    // Only add company_id if provided
    if (companyIdStr && companyIdStr !== '') {
      data.company_id = parseInt(companyIdStr);
    }

    createContact.mutate(data, {
      onSuccess: () => {
        toast.success('Contact created successfully');
        setIsCreateDialogOpen(false);
        refetch();
      },
      onError: (error: any) => {
        toast.error(`Failed to create contact: ${error.message}`);
      },
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteContact.mutate({ id }, {
        onSuccess: () => {
          toast.success('Contact deleted successfully');
          refetch();
        },
        onError: (error: any) => {
          toast.error(`Failed to delete contact: ${error.message}`);
        },
      });
    }
  };

  const handleSetPrimary = (id: number) => {
    setPrimary.mutate({ id }, {
      onSuccess: () => {
        toast.success('Primary contact updated');
        refetch();
      },
      onError: (error: any) => {
        toast.error(`Failed to set primary: ${error.message}`);
      },
    });
  };

  const companiesArray = companies || [];
  const contactsArray = contacts || [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <div className="flex justify-center py-12">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <div className="flex justify-center py-12">
            <p className="text-red-500">Error loading contacts: {error.message}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
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
                        {companiesArray.map((company: any) => (
                          <SelectItem key={company.id} value={company.id.toString() ?? ''}>
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
                      className="rounded border-border"
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
                    className="bg-primary hover:bg-primary/90"
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? 'Creating...' : 'Create Contact'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-background">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Description</TableHead>
                <TableHead className="text-foreground font-semibold">Company</TableHead>
                <TableHead className="text-foreground font-semibold">Email</TableHead>
                <TableHead className="text-foreground font-semibold">Phone</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No contacts found. Create your first contact to get started.
                  </TableCell>
                </TableRow>
              ) : (
                contactsArray.map((contact: any) => (
                    <ClickableTableRow
                      key={contact.id}
                      href={ROUTES.contacts.detail(contact.id)}
                      className="hover:bg-background"
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link href={ROUTES.contacts.detail(contact.id)} className="text-primary hover:underline">
                              {contact.first_name} {contact.last_name}
                            </Link>
                            {contact.is_primary && (
                              <Badge variant="default" className="bg-primary text-white text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          {contact.role && (
                            <span className="text-xs text-muted-foreground">{contact.role}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{contact.description || '—'}</TableCell>
                      <TableCell className="text-foreground">
                        {contact.company_name || '—'}
                      </TableCell>
                      <TableCell className="text-foreground">{contact.email || '—'}</TableCell>
                      <TableCell className="text-foreground">{contact.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {!contact.is_primary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-foreground hover:bg-secondary"
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
                    </ClickableTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
      </div>
    </MainLayout>
  );
}
