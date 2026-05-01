'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2, CheckCircle } from 'lucide-react';

export default function EmailPreviewTestPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('riemer.vandervliet@live.nl');

  const handleSendTestEmail = async () => {
    setSending(true);
    setSent(false);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: recipientEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test email');
      }

      console.log('Test email sent:', result);
      alert(
        `✅ Test email sent successfully!\n\nTo: ${result.sentTo}\nSubject: ${result.subject}\nMessage ID: ${result.messageId}\n\nCheck your inbox at ${recipientEmail}!`
      );
      setSent(true);
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      alert(`❌ Failed to send test email:\n\n${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Test Email Sending</h1>
          <p className="text-muted-foreground mt-2">
            Send a real test email to verify SMTP configuration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Real Test Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a real test email to verify SMTP configuration is working. This will
              send an actual email with a professional invoice template.
            </p>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <Button
              onClick={handleSendTestEmail}
              disabled={sending || !recipientEmail}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Test Email...
                </>
              ) : sent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Email Sent! Send Another?
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {sent && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  ✅ Test email sent successfully! Check your inbox at {recipientEmail}
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold mb-2">Test Email Contains:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>
                  <strong>Subject:</strong> Test Invoice INV-20260501-TEST
                </li>
                <li>
                  <strong>Client:</strong> Jaime Essed
                </li>
                <li>
                  <strong>Project:</strong> Website Redesign Project
                </li>
                <li>
                  <strong>Amount:</strong> €2,450.00
                </li>
                <li>
                  <strong>Due Date:</strong> May 15, 2026
                </li>
                <li>
                  <strong>Format:</strong> Beautiful HTML email with professional styling
                </li>
                <li>
                  <strong>Signature:</strong> Riemer van der Vliet signature included
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This uses your actual SMTP credentials from .env.local
                to send a real email. Make sure your dev server is running!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
