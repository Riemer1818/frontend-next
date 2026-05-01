'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send, Paperclip } from 'lucide-react';

export interface EmailData {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: Array<{ filename: string; size?: number }>;
}

export interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailData;
  onSend: (emailData: EmailData) => Promise<void>;
  sending?: boolean;
  title?: string;
  description?: string;
}

/**
 * Reusable email preview modal component
 * Can be used from any part of the application to preview and send emails
 */
export function EmailPreviewModal({
  open,
  onOpenChange,
  emailData,
  onSend,
  sending = false,
  title = 'Preview Email',
  description = 'Review and edit the email before sending',
}: EmailPreviewModalProps) {
  const [editedEmail, setEditedEmail] = useState(emailData);

  // Reset edited email when emailData changes
  useState(() => {
    setEditedEmail(emailData);
  });

  const handleSend = async () => {
    await onSend(editedEmail);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* To */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              value={editedEmail.to}
              onChange={(e) => setEditedEmail({ ...editedEmail, to: e.target.value })}
              placeholder="recipient@example.com"
            />
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              type="email"
              value={editedEmail.cc || ''}
              onChange={(e) => setEditedEmail({ ...editedEmail, cc: e.target.value })}
              placeholder="cc@example.com"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={editedEmail.subject}
              onChange={(e) => setEditedEmail({ ...editedEmail, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>

          {/* Attachments */}
          {editedEmail.attachments && editedEmail.attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border rounded-lg p-3 bg-secondary/10">
                {editedEmail.attachments.map((attachment, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{attachment.filename}</span>
                    {attachment.size && (
                      <span className="text-muted-foreground text-xs">
                        ({(attachment.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={editedEmail.bodyText}
              onChange={(e) => setEditedEmail({ ...editedEmail, bodyText: e.target.value })}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* HTML Preview (if available) */}
          {editedEmail.bodyHtml && (
            <div className="space-y-2">
              <Label>HTML Preview</Label>
              <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: editedEmail.bodyHtml }}
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !editedEmail.to || !editedEmail.subject}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
