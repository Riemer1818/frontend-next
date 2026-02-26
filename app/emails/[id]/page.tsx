'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Download, FileText, Mail } from 'lucide-react';
import Link from 'next/link';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const utils = trpc.useUtils();

  const { data: email, isLoading } = trpc.email.getById.useQuery({ id });
  const { data: companies } = trpc.company.getAll.useQuery();
  const { data: contacts } = trpc.contact.getAll.useQuery();

  const updateLabel = trpc.email.updateLabel.useMutation({
    onSuccess: () => {
      utils.email.getById.invalidate({ id });
      utils.email.list.invalidate();
    },
  });

  const deleteEmail = trpc.email.delete.useMutation({
    onSuccess: () => {
      router.push('/dashboard');
    },
  });

  const linkToCompany = trpc.email.linkToCompany.useMutation({
    onSuccess: () => {
      utils.email.getById.invalidate({ id });
      utils.email.getByCompany.invalidate();
    },
  });

  const linkToContact = trpc.email.linkToContact.useMutation({
    onSuccess: () => {
      utils.email.getById.invalidate({ id });
      utils.email.getByContact.invalidate();
    },
  });

  const handleLabelUpdate = (label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other') => {
    updateLabel.mutate({ id, label });
  };

  const handleDelete = () => {
    deleteEmail.mutate({ id });
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

  if (!email) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Email not found</p>
        </div>
      </MainLayout>
    );
  }

  const getLabelBadge = (label: string | null) => {
    if (!label) return <Badge variant="outline">Unlabeled</Badge>;

    const variants: Record<string, any> = {
      incoming_invoice: 'default',
      receipt: 'secondary',
      newsletter: 'outline',
      other: 'destructive',
    };

    return (
      <Badge variant={variants[label] || 'outline'}>
        {label.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline', label: 'Pending' },
      processing: { variant: 'default', label: 'Processing' },
      completed: { variant: 'secondary', label: 'Processed' },
      failed: { variant: 'destructive', label: 'Failed' },
      skipped: { variant: 'outline', label: 'Skipped' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Email Details</h1>
              <p className="text-slate-600 mt-1">
                {format(new Date(email.email_date), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getLabelBadge(email.label)}
            {getStatusBadge(email.processing_status)}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEmail.isLoading}
            >
              Delete Email
            </Button>
          </div>
        </div>

        {/* Email Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Subject</label>
              <p className="text-lg font-semibold text-slate-900">{email.subject || '(no subject)'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">From</label>
                <p className="text-slate-900">{email.from_address}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">To</label>
                <p className="text-slate-900">{email.to_address || '—'}</p>
              </div>

              {email.cc_address && (
                <div>
                  <label className="text-sm font-medium text-slate-600">CC</label>
                  <p className="text-slate-900">{email.cc_address}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">Date</label>
                <p className="text-slate-900">
                  {format(new Date(email.email_date), 'PPPP p')}
                </p>
              </div>
            </div>

            {email.linked_invoice_id && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-slate-600">Linked Invoice</label>
                <div className="mt-2">
                  <Link href={`/expenses/${email.linked_invoice_id}`}>
                    <Button variant="outline" size="sm">
                      View Invoice #{email.linked_invoice_id}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600">Linked Company</label>
                {email.linked_company_id ? (
                  <div className="mt-2 flex gap-2 items-center">
                    <Link href={`/companies/${email.linked_company_id}`}>
                      <Button variant="outline" size="sm">
                        View Company
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => linkToCompany.mutate({ emailId: id, companyId: null })}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(e) => {
                        const companyId = parseInt(e.target.value);
                        if (companyId) {
                          linkToCompany.mutate({ emailId: id, companyId });
                        }
                      }}
                    >
                      <option value="">Select company...</option>
                      {companies?.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Linked Contact</label>
                {email.linked_contact_id ? (
                  <div className="mt-2 flex gap-2 items-center">
                    <Link href={`/contacts/${email.linked_contact_id}`}>
                      <Button variant="outline" size="sm">
                        View Contact
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => linkToContact.mutate({ emailId: id, contactId: null })}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(e) => {
                        const contactId = parseInt(e.target.value);
                        if (contactId) {
                          linkToContact.mutate({ emailId: id, contactId });
                        }
                      }}
                    >
                      <option value="">Select contact...</option>
                      {contacts?.map((contact: any) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Label Actions */}
        {!email.label && (
          <Card>
            <CardHeader>
              <CardTitle>Label this Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleLabelUpdate('incoming_invoice')}
                  disabled={updateLabel.isLoading}
                >
                  Invoice
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('receipt')}
                  disabled={updateLabel.isLoading}
                >
                  Receipt
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('newsletter')}
                  disabled={updateLabel.isLoading}
                >
                  Newsletter
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('other')}
                  disabled={updateLabel.isLoading}
                >
                  Other
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Body */}
        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
          </CardHeader>
          <CardContent>
            {email.body_html ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : email.body_text ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-900">
                {email.body_text}
              </pre>
            ) : (
              <p className="text-slate-500">No email body content</p>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attachments ({email.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {email.attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">{attachment.filename}</p>
                        <p className="text-xs text-slate-500">
                          {attachment.mime_type} • {(attachment.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([attachment.file_data], { type: attachment.mime_type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = attachment.filename;
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Error */}
        {email.processing_status === 'failed' && email.processing_error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Processing Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 text-sm">{email.processing_error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
