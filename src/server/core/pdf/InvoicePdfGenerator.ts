import { jsPDF } from 'jspdf';
import { Pool } from 'pg';

export interface InvoiceData {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  project_name: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  tax_rate: number;
  notes?: string;
}

export interface TimeEntryItem {
  date: string;
  description: string;
  chargeable_hours: number;
  hourly_rate: number;
  amount: number;
}

export class InvoicePdfGenerator {
  /**
   * Fetch logo from public URL and convert to base64 data URL
   * Works in both Node.js and Cloudflare Workers
   */
  private async getLogoDataUrl(): Promise<string> {
    try {
      // In production (Cloudflare/Vercel), fetch from public folder
      // In development, this will work with Next.js dev server
      const response = await fetch('/logo.png');
      if (!response.ok) {
        console.warn('Logo not found at /logo.png');
        return '';
      }
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Could not load logo:', error);
      return '';
    }
  }

  /**
   * Generate PDF for an invoice using jsPDF
   */
  async generatePdf(invoiceId: number, db: Pool, summarize: boolean = true): Promise<Buffer> {
    // Fetch business info
    const businessInfoResult = await db.query('SELECT * FROM backoffice_business_info LIMIT 1');
    const businessInfo = businessInfoResult.rows[0];

    if (!businessInfo) {
      throw new Error('Business info not found in database');
    }

    // Fetch invoice data
    const invoiceResult = await db.query(
      `SELECT i.*,
              c.name as client_name,
              c.email as client_email,
              c.phone as client_phone,
              c.street_address as client_address,
              c.postal_code as client_postal,
              c.city as client_city,
              c.kvk_number as client_kvk,
              c.btw_number as client_btw,
              p.name as project_name,
              p.hourly_rate
       FROM backoffice_invoices i
       LEFT JOIN companies c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const invoice = invoiceResult.rows[0];

    // Fetch time entries for this invoice
    const timeEntriesResult = await db.query(
      `SELECT te.date, te.notes, te.chargeable_hours, p.hourly_rate
       FROM backoffice_time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.invoice_id = $1
       ORDER BY te.date ASC`,
      [invoiceId]
    );

    const timeEntries = timeEntriesResult.rows.map((entry: any) => ({
      date: entry.date,
      description: entry.notes || 'Werkzaamheden',
      chargeable_hours: parseFloat(entry.chargeable_hours),
      hourly_rate: parseFloat(entry.hourly_rate),
      amount: parseFloat(entry.chargeable_hours) * parseFloat(entry.hourly_rate),
    }));

    // Calculate tax rate percentage
    const taxRate = (parseFloat(invoice.tax_amount) / parseFloat(invoice.subtotal)) * 100;

    // Generate PDF using jsPDF
    return await this.generatePdfWithJsPDF(invoice, timeEntries, taxRate, businessInfo, summarize);
  }

  /**
   * Generate PDF using jsPDF (follows MOODSVIBE pattern)
   */
  private async generatePdfWithJsPDF(
    invoice: any,
    timeEntries: TimeEntryItem[],
    taxRate: number,
    businessInfo: any,
    summarize: boolean
  ): Promise<Buffer> {
    // Initialize PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const PAGE_WIDTH = pdf.internal.pageSize.getWidth();  // 210mm
    const PAGE_HEIGHT = pdf.internal.pageSize.getHeight(); // 297mm
    const MARGIN = 20;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    let y = MARGIN;

    // Load and add logo
    const logoDataUrl = await this.getLogoDataUrl();
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, 'PNG', MARGIN, y, 30, 15);
      } catch (err) {
        console.warn('Could not add logo to PDF:', err);
      }
    }

    // Business info (top left, below logo)
    y += 20;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(businessInfo.name || 'Business Name', MARGIN, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(businessInfo.street_address || '', MARGIN, y);
    y += 4;
    pdf.text(`${businessInfo.postal_code || ''} ${businessInfo.city || ''}`, MARGIN, y);
    y += 4;
    pdf.text(`KVK: ${businessInfo.kvk_number || ''}  BTW: ${businessInfo.btw_number || ''}`, MARGIN, y);
    y += 4;
    pdf.text(`Email: ${businessInfo.email || ''}`, MARGIN, y);
    y += 4;
    pdf.text(`Tel: ${businessInfo.phone || ''}`, MARGIN, y);

    // Invoice metadata (top right)
    let metaY = MARGIN + 20;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`Factuur ${invoice.invoice_number}`, PAGE_WIDTH - MARGIN, metaY, { align: 'right' });
    metaY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Datum: ${new Date(invoice.invoice_date).toLocaleDateString('nl-NL')}`, PAGE_WIDTH - MARGIN, metaY, { align: 'right' });
    metaY += 4;
    pdf.text(`Vervaldatum: ${new Date(invoice.due_date).toLocaleDateString('nl-NL')}`, PAGE_WIDTH - MARGIN, metaY, { align: 'right' });

    // Client section
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Factuur aan:', MARGIN, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(invoice.client_name || '', MARGIN, y);
    y += 4;
    if (invoice.client_address) {
      pdf.text(invoice.client_address, MARGIN, y);
      y += 4;
    }
    pdf.text(`${invoice.client_postal || ''} ${invoice.client_city || ''}`, MARGIN, y);
    y += 4;
    if (invoice.client_kvk) {
      pdf.text(`KVK: ${invoice.client_kvk}`, MARGIN, y);
      y += 4;
    }

    // Items table
    y += 10;
    const tableStartY = y;

    // Table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
    y += 5;

    pdf.text('Omschrijving', MARGIN + 2, y);
    pdf.text('Uren', MARGIN + 110, y, { align: 'right' });
    pdf.text('Bedrag', MARGIN + 145, y, { align: 'right' });
    pdf.text('BTW%', PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });
    y += 4;

    // Draw line under header
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 5;

    // Table rows
    pdf.setFont('helvetica', 'normal');
    if (summarize && timeEntries.length > 0) {
      // Summarized view
      const totalHours = timeEntries.reduce((sum, entry) => sum + entry.chargeable_hours, 0);
      const roundedHours = Math.ceil(totalHours);
      const dates = timeEntries.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0].toLocaleDateString('nl-NL');
      const endDate = dates[dates.length - 1].toLocaleDateString('nl-NL');
      const rate = timeEntries[0]?.hourly_rate || 0;
      const amount = roundedHours * rate;

      const description = `Development services (${startDate} - ${endDate})\n${timeEntries.length} time entries`;
      const wrappedDesc = pdf.splitTextToSize(description, 100);

      for (let i = 0; i < wrappedDesc.length; i++) {
        pdf.text(wrappedDesc[i], MARGIN + 2, y);
        if (i === 0) {
          pdf.text(`${roundedHours}h`, MARGIN + 110, y, { align: 'right' });
          pdf.text(`€${amount.toFixed(2)}`, MARGIN + 145, y, { align: 'right' });
          pdf.text(`${taxRate.toFixed(0)}%`, PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });
        }
        y += 5;
      }
    } else {
      // Detailed view
      for (const entry of timeEntries) {
        const dateStr = new Date(entry.date).toLocaleDateString('nl-NL');
        const description = `${dateStr} - ${entry.description}`;
        const wrappedDesc = pdf.splitTextToSize(description, 100);

        for (let i = 0; i < wrappedDesc.length; i++) {
          y = this.addPageBreakIfNeeded(pdf, y, 5, PAGE_HEIGHT, MARGIN);
          pdf.text(wrappedDesc[i], MARGIN + 2, y);
          if (i === 0) {
            pdf.text(`${entry.chargeable_hours.toFixed(2)}h`, MARGIN + 110, y, { align: 'right' });
            pdf.text(`€${entry.amount.toFixed(2)}`, MARGIN + 145, y, { align: 'right' });
            pdf.text(`${taxRate.toFixed(0)}%`, PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });
          }
          y += 5;
        }
        y += 2; // spacing between entries
      }
    }

    // Draw line above totals
    y += 3;
    pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 8;

    // Totals section
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    const totalsX = PAGE_WIDTH - MARGIN - 50;
    pdf.text('Subtotaal:', totalsX, y);
    pdf.text(`€${parseFloat(invoice.subtotal).toFixed(2)}`, PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });
    y += 6;

    pdf.text(`BTW (${taxRate.toFixed(0)}%):`, totalsX, y);
    pdf.text(`€${parseFloat(invoice.tax_amount).toFixed(2)}`, PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Totaal:', totalsX, y);
    pdf.text(`€${parseFloat(invoice.total_amount).toFixed(2)}`, PAGE_WIDTH - MARGIN - 2, y, { align: 'right' });

    // Payment terms (footer)
    y += 15;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Betaling binnen 14 dagen op:', MARGIN, y);
    y += 5;
    pdf.text(`IBAN: ${businessInfo.iban || ''}`, MARGIN, y);
    y += 4;
    pdf.text(`O.v.v. ${invoice.invoice_number}`, MARGIN, y);

    // Save to buffer
    const pdfBytes = pdf.output('arraybuffer');
    return Buffer.from(pdfBytes);
  }

  /**
   * Add page break if needed (follows MOODSVIBE pattern)
   */
  private addPageBreakIfNeeded(pdf: jsPDF, y: number, neededHeight: number, pageHeight: number, margin: number): number {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      return margin;
    }
    return y;
  }
}
