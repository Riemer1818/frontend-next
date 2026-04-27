import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { ImapEmailService, Email as ImapEmail } from '@/server/core/email/ImapEmailService';
import { EmailRepository, type EmailRecord, type EmailFilters } from '@/server/repositories/EmailRepository';

export interface EmailListResult {
  emails: EmailRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmailStats {
  total: number;
  unread: number;
  processed: number;
  pending: number;
  failed: number;
  with_attachments: number;
}

/**
 * Service for managing email operations
 * Orchestrates between IMAP service, email repository, and business logic
 */
export class EmailManagementService {
  private emailRepository: EmailRepository;
  private imapService: ImapEmailService;

  constructor(
    private supabase: SupabaseClient<Database>,
    imapConfig: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
    }
  ) {
    this.emailRepository = new EmailRepository(supabase);
    this.imapService = new ImapEmailService(imapConfig);
  }

  /**
   * Fetch unread emails from IMAP and save to database
   * After saving, marks emails as read in IMAP
   */
  async fetchAndSaveUnreadEmails(): Promise<EmailRecord[]> {
    console.log('📧 Fetching unread emails from IMAP...');

    const imapEmails = await this.imapService.fetchUnreadEmails();
    console.log(`📬 Found ${imapEmails.length} unread emails`);

    const savedEmails: EmailRecord[] = [];

    for (const imapEmail of imapEmails) {
      try {
        // Check by subject + from + date (most reliable since UIDs can be reused)
        const { data: existing } = await this.supabase
          .from('backoffice_emails')
          .select('id')
          .eq('subject', imapEmail.subject)
          .eq('from_address', imapEmail.from)
          .eq('email_date', imapEmail.date.toISOString())
          .limit(1)
          .single();

        if (existing) {
          console.log(`⏭️  Email "${imapEmail.subject.substring(0, 50)}" already exists, skipping`);
          continue;
        }

        // Save email to database
        const savedEmail = await this.saveEmail(imapEmail);
        savedEmails.push(savedEmail);
        console.log(`✅ Saved email: ${savedEmail.subject} (ID: ${savedEmail.id})`);

        // Mark as read in IMAP
        try {
          await this.imapService.markAsRead(imapEmail.id);
          console.log(`📧 Marked email ${imapEmail.id} as read in IMAP`);
        } catch (error) {
          console.error(`⚠️ Failed to mark email ${imapEmail.id} as read in IMAP:`, error);
          // Don't fail the whole process if marking as read fails
        }
      } catch (error) {
        console.error(`❌ Failed to save email ${imapEmail.id}:`, error);
      }
    }

    console.log(`💾 Saved ${savedEmails.length} new emails to database`);
    return savedEmails;
  }

  /**
   * Save a single email to database
   * Note: Supabase doesn't support transactions via REST API, so this is best-effort
   */
  async saveEmail(imapEmail: ImapEmail): Promise<EmailRecord> {
    try {
      // Create email record
      const emailRecord = await this.emailRepository.create({
        email_uid: imapEmail.id,
        subject: imapEmail.subject,
        from_address: imapEmail.from,
        to_address: imapEmail.to,
        cc_address: imapEmail.cc,
        bcc_address: imapEmail.bcc,
        email_date: imapEmail.date,
        body_text: imapEmail.body,
        body_html: imapEmail.htmlBody,
        is_read: false,
        has_attachments: imapEmail.attachments.length > 0,
        attachment_count: imapEmail.attachments.length,
      });

      // Save attachments
      for (const attachment of imapEmail.attachments) {
        await this.emailRepository.createAttachment({
          email_id: emailRecord.id,
          filename: attachment.filename,
          mime_type: attachment.mimeType,
          file_size: attachment.size,
          file_data: attachment.data,
        });
      }

      // Auto-match to company/contact
      const match = await this.emailRepository.autoMatchCompanyContact(imapEmail.from);
      if (match.companyId || match.contactId) {
        await this.supabase
          .from('backoffice_emails')
          .update({
            linked_company_id: match.companyId,
            linked_contact_id: match.contactId,
          })
          .eq('id', emailRecord.id);

        console.log(`Auto-linked email ${emailRecord.id} to company: ${match.companyId}, contact: ${match.contactId}`);
      }

      // Return updated record with links
      const updatedRecord = await this.emailRepository.findById(emailRecord.id);
      return updatedRecord || emailRecord;
    } catch (error) {
      console.error('Failed to save email:', error);
      throw error;
    }
  }

  /**
   * Get email by ID
   */
  async getEmailById(id: number): Promise<EmailRecord | null> {
    return this.emailRepository.findById(id);
  }

  /**
   * Get email by UID
   */
  async getEmailByUid(uid: string): Promise<EmailRecord | null> {
    return this.emailRepository.findByUid(uid);
  }

  /**
   * List emails with pagination and filters
   */
  async listEmails(
    filters: EmailFilters = {},
    page: number = 1,
    pageSize: number = 50,
    showUnlabeledOnly: boolean = true
  ): Promise<EmailListResult> {
    const offset = (page - 1) * pageSize;

    const effectiveFilters = { ...filters };

    // By default, only show unlabeled emails (NULL label)
    // Unless a specific label is requested or showUnlabeledOnly is false
    if (showUnlabeledOnly && effectiveFilters.label === undefined) {
      effectiveFilters.labelIsNull = true;
    }

    const emails = await this.emailRepository.list({
      ...effectiveFilters,
      limit: pageSize,
      offset,
    });

    // Get total count (would need a separate count query for accuracy)
    const stats = await this.emailRepository.getStats();
    const total = stats.total;

    return {
      emails,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get unprocessed emails
   */
  async getUnprocessedEmails(limit: number = 100): Promise<EmailRecord[]> {
    return this.emailRepository.list({
      is_processed: false,
      processing_status: 'pending',
      limit,
    });
  }

  /**
   * Get failed emails
   */
  async getFailedEmails(limit: number = 100): Promise<EmailRecord[]> {
    return this.emailRepository.list({
      processing_status: 'failed',
      limit,
    });
  }

  /**
   * Get email attachments
   */
  async getEmailAttachments(emailId: number) {
    return this.emailRepository.getAttachments(emailId);
  }

  /**
   * Get single attachment
   */
  async getAttachment(attachmentId: number) {
    return this.emailRepository.getAttachment(attachmentId);
  }

  /**
   * Mark email as read (in database)
   */
  async markAsRead(emailId: number): Promise<EmailRecord | null> {
    return this.emailRepository.markAsRead(emailId);
  }

  /**
   * Mark email as read in IMAP
   */
  async markAsReadInImap(uid: string): Promise<void> {
    return this.imapService.markAsRead(uid);
  }

  /**
   * Update email processing status
   */
  async updateProcessingStatus(
    emailId: number,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped',
    error?: string
  ): Promise<EmailRecord | null> {
    return this.emailRepository.updateProcessingStatus(emailId, status, error);
  }

  /**
   * Link email to invoice
   */
  async linkToInvoice(emailId: number, invoiceId: number): Promise<EmailRecord | null> {
    return this.emailRepository.linkToInvoice(emailId, invoiceId);
  }

  /**
   * Delete email
   */
  async deleteEmail(emailId: number): Promise<boolean> {
    // Instead of deleting, mark as dismissed so it doesn't get re-fetched
    const { error } = await this.supabase
      .from('backoffice_emails')
      .update({ dismissed: true })
      .eq('id', emailId);

    return !error;
  }

  /**
   * Get email statistics
   */
  async getStats(): Promise<EmailStats> {
    return this.emailRepository.getStats();
  }

  /**
   * Retry processing a failed email
   */
  async retryFailedEmail(emailId: number): Promise<EmailRecord | null> {
    const email = await this.emailRepository.findById(emailId);

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    if (email.processing_status !== 'failed') {
      throw new Error(`Email ${emailId} is not in failed status`);
    }

    // Reset to pending for reprocessing
    return this.emailRepository.updateProcessingStatus(emailId, 'pending');
  }

  /**
   * Check if email exists
   */
  async emailExists(uid: string): Promise<boolean> {
    return this.emailRepository.existsByUid(uid);
  }

  /**
   * Update email label and process if needed
   */
  async updateEmailLabel(
    emailId: number,
    label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other' | null
  ): Promise<EmailRecord | null> {
    const updatedEmail = await this.emailRepository.updateLabel(emailId, label);

    if (!updatedEmail) {
      return null;
    }

    // Auto-process invoices and receipts, but keep them pending for manual review
    if (label === 'incoming_invoice' || label === 'receipt') {
      try {
        console.log(`Processing email ${emailId} as ${label}...`);
        await this.processEmailAsInvoice(updatedEmail);

        // Keep as 'pending' so they show up in Expenses Pending Review for manual confirmation
        // They won't show in the Emails tab anymore (they have a label now)
        // But they will show in the Expenses tab (processing_status = 'pending')
        await this.emailRepository.updateProcessingStatus(emailId, 'pending');
      } catch (error) {
        console.error(`Failed to process email ${emailId} as invoice:`, error);
        await this.emailRepository.updateProcessingStatus(
          emailId,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } else if (label === 'newsletter' || label === 'other') {
      // Just mark as processed, no further action
      await this.emailRepository.updateProcessingStatus(emailId, 'skipped');
    }

    return updatedEmail;
  }

  /**
   * Process an email as an invoice - creates incoming_invoice record
   * Extracts data from PDF attachments using AI
   */
  private async processEmailAsInvoice(email: EmailRecord): Promise<void> {
    console.log(`Creating incoming invoice for email ${email.id}...`);

    // Get email attachments
    const attachments = await this.emailRepository.getAttachments(email.id);

    // Extract basic info from email
    const subject = email.subject || 'Invoice';
    const fromAddress = email.from_address;

    // Try to extract invoice data from PDF attachments
    let extractedData: any = null;

    for (const attachment of attachments) {
      if (attachment.mime_type === 'application/pdf') {
        try {
          console.log(`Extracting invoice data from PDF: ${attachment.filename}`);
          const { extractInvoiceFromPdf } = await import('@/app/actions/extract-invoice');

          // Handle file_data - it might be a Buffer, string (JSON), or object
          let pdfBuffer: Buffer;
          if (Buffer.isBuffer(attachment.file_data)) {
            pdfBuffer = attachment.file_data;
          } else if (typeof attachment.file_data === 'string') {
            // Handle PostgreSQL hex format (starts with \x)
            if (attachment.file_data.startsWith('\\x')) {
              // Remove \x prefix and convert hex to buffer
              const hex = attachment.file_data.slice(2);
              const hexBuffer = Buffer.from(hex, 'hex');
              // The hex buffer contains JSON, parse it
              try {
                const parsed = JSON.parse(hexBuffer.toString('utf8'));
                if (parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
                  pdfBuffer = Buffer.from(parsed.data);
                } else {
                  console.error('Unexpected parsed format:', parsed);
                  continue;
                }
              } catch (e) {
                console.error('Failed to parse hex buffer as JSON:', e);
                continue;
              }
            } else {
              // Try parsing as direct JSON
              try {
                const parsed = JSON.parse(attachment.file_data);
                if (parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
                  pdfBuffer = Buffer.from(parsed.data);
                } else {
                  console.error('Unexpected parsed format:', parsed);
                  continue;
                }
              } catch (e) {
                console.error('Failed to parse file_data JSON:', e);
                continue;
              }
            }
          } else if (typeof attachment.file_data === 'object' && attachment.file_data.data) {
            // Handle {type: 'Buffer', data: [..]} format
            pdfBuffer = Buffer.from(attachment.file_data.data);
          } else {
            console.error('Unexpected file_data format:', typeof attachment.file_data);
            continue;
          }

          const base64 = pdfBuffer.toString('base64');
          const result = await extractInvoiceFromPdf(base64, {
            subject: email.subject || undefined,
            from: email.from_address,
            body: email.body_text || undefined,
          });

          if (result.success && result.data) {
            extractedData = result.data;
            console.log(`✅ Extracted invoice data:`, extractedData);
            break; // Use first PDF that successfully extracts
          }
        } catch (error) {
          console.error(`Failed to extract from ${attachment.filename}:`, error);
        }
      }
    }

    // Determine values to use (extracted or defaults)
    const supplierName = extractedData?.supplier_name || fromAddress;
    const invoiceDate = extractedData?.invoice_date || email.email_date.toISOString().split('T')[0];
    const description = extractedData?.description || subject;
    const originalTotalAmount = extractedData?.total_amount || 0;
    const originalTaxAmount = extractedData?.tax_amount || 0;
    const originalSubtotal = extractedData?.subtotal || (originalTotalAmount - originalTaxAmount);
    const currency = extractedData?.currency || 'EUR';
    const invoiceNumber = extractedData?.invoice_number || null;

    // Currency conversion
    let totalAmount = originalTotalAmount;
    let taxAmount = originalTaxAmount;
    let subtotal = originalSubtotal;
    let exchangeRate = 1.0;

    if (currency.toUpperCase() !== 'EUR') {
      console.log(`💱 Converting ${currency} ${originalTotalAmount} to EUR`);
      const { CurrencyConverter } = await import('@/server/core/currency/CurrencyConverter');
      const converter = new CurrencyConverter();

      const conversion = await converter.convert(
        originalTotalAmount,
        currency,
        'EUR',
        invoiceDate
      );

      totalAmount = conversion.convertedAmount;
      exchangeRate = conversion.rate;

      // Convert subtotal and VAT proportionally
      const ratio = totalAmount / originalTotalAmount;
      subtotal = originalSubtotal * ratio;
      taxAmount = originalTaxAmount * ratio;

      console.log(`✅ Converted: €${totalAmount.toFixed(2)} (rate: ${exchangeRate.toFixed(4)})`);
    }

    // Try to find or create supplier
    const domain = fromAddress.split('@')[1] || '';
    let supplierId: number | null = null;

    if (domain) {
      const { data: existingSupplier } = await this.supabase
        .from('backoffice_companies')
        .select('id')
        .ilike('website', `%${domain}%`)
        .eq('type', 'supplier')
        .limit(1)
        .single();

      supplierId = existingSupplier?.id || null;
    }

    // Create incoming invoice with extracted or default data
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('backoffice_incoming_invoices')
      .insert({
        supplier_id: supplierId,
        supplier_name: supplierName,
        invoice_date: invoiceDate,
        description: description,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        review_status: 'pending',
        payment_status: 'paid',
        source: 'email',
        source_email_id: email.email_uid,
        source_email_subject: subject,
        source_email_from: fromAddress,
        source_email_date: email.email_date.toISOString(),
        original_currency: currency !== 'EUR' ? currency : null,
        original_amount: currency !== 'EUR' ? originalTotalAmount : null,
        original_subtotal: currency !== 'EUR' ? originalSubtotal : null,
        original_tax_amount: currency !== 'EUR' ? originalTaxAmount : null,
        exchange_rate: currency !== 'EUR' ? exchangeRate : null,
        exchange_rate_date: currency !== 'EUR' ? invoiceDate : null,
        notes: extractedData
          ? `Auto-extracted from PDF${invoiceNumber ? ` - Invoice #${invoiceNumber}` : ''}${currency !== 'EUR' ? `\nOriginal: ${currency} ${originalTotalAmount.toFixed(2)}` : ''}\nAttachments: ${attachments.length}`
          : `Auto-created from email. Please review and update amounts.\nAttachments: ${attachments.length}`,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Failed to create incoming invoice:', invoiceError);
      throw invoiceError;
    }

    console.log(`Created invoice #${invoice.id}`);

    // Link invoice to email
    await this.emailRepository.linkToInvoice(email.id, invoice.id);

    // Copy attachments to invoice
    for (const attachment of attachments) {
      const { error: attachError } = await this.supabase
        .from('backoffice_invoice_attachments')
        .insert({
          incoming_invoice_id: invoice.id,
          file_data: attachment.file_data,
          file_name: attachment.filename,
          file_type: attachment.mime_type,
          file_size: attachment.file_size,
          attachment_type: 'invoice',
        });

      if (attachError) {
        console.error(`Failed to copy attachment ${attachment.filename}:`, attachError);
      }
    }

    console.log(`Linked ${attachments.length} attachment(s) to invoice #${invoice.id}`);
  }

  /**
   * Manually link email to company
   */
  async linkEmailToCompany(emailId: number, companyId: number | null): Promise<EmailRecord | null> {
    return this.emailRepository.linkToCompany(emailId, companyId);
  }

  /**
   * Manually link email to contact
   */
  async linkEmailToContact(emailId: number, contactId: number | null): Promise<EmailRecord | null> {
    return this.emailRepository.linkToContact(emailId, contactId);
  }
}