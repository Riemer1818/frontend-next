import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';
import { EmailManagementService } from '@/server/services/EmailManagementService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Helper to create email service instance
function createEmailService(supabase: SupabaseClient<Database>) {
  return new EmailManagementService(supabase, {
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASSWORD || '',
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993'),
    tls: true,
  });
}

export const emailRouter = router({
  /**
   * Fetch unread emails from IMAP
   * Saves them to database and marks as read in IMAP
   */
  fetchUnread: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const emailService = createEmailService(ctx.supabase);
      const emails = await emailService.fetchAndSaveUnreadEmails();
      return {
        success: true,
        count: emails.length,
        emails,
      };
    } catch (error) {
      console.error('Error fetching unread emails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        emails: [],
      };
    }
  }),

  /**
   * List emails from database with filters and pagination
   * By default, only shows unlabeled emails (for dashboard inbox)
   */
  list: publicProcedure
    .input(
      z.object({
        is_read: z.boolean().optional(),
        label: z.enum(['incoming_invoice', 'receipt', 'newsletter', 'other']).nullable().optional(),
        has_attachments: z.boolean().optional(),
        from_address: z.string().optional(),
        showUnlabeledOnly: z.boolean().optional().default(true),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const { page, pageSize, showUnlabeledOnly, ...filters } = input;
      return emailService.listEmails(filters, page, pageSize, showUnlabeledOnly);
    }),

  /**
   * Get single email by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const email = await emailService.getEmailById(input.id);
      if (!email) {
        throw new Error('Email not found');
      }

      const attachments = await emailService.getEmailAttachments(input.id);

      return {
        ...email,
        attachments,
      };
    }),

  /**
   * Update email label
   */
  updateLabel: publicProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.enum(['incoming_invoice', 'receipt', 'newsletter', 'other']).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const updatedEmail = await emailService.updateEmailLabel(input.id, input.label);
      if (!updatedEmail) {
        throw new Error('Email not found');
      }
      return updatedEmail;
    }),

  /**
   * Mark email as read (in database)
   */
  markAsRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const updatedEmail = await emailService.markAsRead(input.id);
      if (!updatedEmail) {
        throw new Error('Email not found');
      }
      return updatedEmail;
    }),

  /**
   * Get email statistics
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    const emailService = createEmailService(ctx.supabase);
    return emailService.getStats();
  }),

  /**
   * Delete email
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const deleted = await emailService.deleteEmail(input.id);
      if (!deleted) {
        throw new Error('Email not found or could not be deleted');
      }
      return { success: true };
    }),

  /**
   * Get emails by company
   */
  getByCompany: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const emails = await emailService.listEmails(
        { linked_company_id: input.companyId },
        1,
        100,
        false
      );
      return emails.emails;
    }),

  /**
   * Get emails by contact
   */
  getByContact: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const emails = await emailService.listEmails(
        { linked_contact_id: input.contactId },
        1,
        100,
        false
      );
      return emails.emails;
    }),

  /**
   * Manually link email to company
   */
  linkToCompany: publicProcedure
    .input(z.object({ emailId: z.number(), companyId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const updated = await emailService.linkEmailToCompany(input.emailId, input.companyId);
      if (!updated) {
        throw new Error('Email not found');
      }
      return updated;
    }),

  /**
   * Manually link email to contact
   */
  linkToContact: publicProcedure
    .input(z.object({ emailId: z.number(), contactId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const emailService = createEmailService(ctx.supabase);
      const updated = await emailService.linkEmailToContact(input.emailId, input.contactId);
      if (!updated) {
        throw new Error('Email not found');
      }
      return updated;
    }),
});
