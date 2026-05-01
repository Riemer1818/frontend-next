export interface InvoiceEmailData {
  clientName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  invoiceDate: string;
  projectName?: string;
}

export interface EmailSignature {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
}

const DEFAULT_SIGNATURE: EmailSignature = {
  name: 'Riemer van der Vliet',
  company: 'riemer.fyi',
  email: 'riemer@riemer.fyi',
  website: 'https://riemer.fyi',
  phone: '+31 6 25236608', 
};

/**
 * Generate plain text email for invoice
 */
export function generateInvoiceEmailText(
  data: InvoiceEmailData,
  signature: EmailSignature = DEFAULT_SIGNATURE
): string {
  return `Dear ${data.clientName},

Please find attached invoice ${data.invoiceNumber} for the amount of €${data.totalAmount.toFixed(2)}.

${data.projectName ? `Project: ${data.projectName}\n` : ''}Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}
Amount: €${data.totalAmount.toFixed(2)}

Payment is kindly requested by ${data.dueDate}.

If you have any questions regarding this invoice, please don't hesitate to contact me.

Best regards,
${signature.name}
${signature.company ? `${signature.company}\n` : ''}${signature.email ? `${signature.email}\n` : ''}${signature.phone ? `${signature.phone}\n` : ''}${signature.website ? `${signature.website}` : ''}`;
}

/**
 * Generate HTML email for invoice
 */
export function generateInvoiceEmailHtml(
  data: InvoiceEmailData,
  signature: EmailSignature = DEFAULT_SIGNATURE
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 24px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .invoice-details {
      background-color: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .invoice-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .invoice-details td {
      padding: 8px 0;
    }
    .invoice-details td:first-child {
      font-weight: 600;
      width: 40%;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .signature {
      margin-top: 24px;
      font-size: 14px;
      color: #6b7280;
    }
    .signature-name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .signature-line {
      margin: 2px 0;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="greeting">Dear ${data.clientName},</div>
      <p>Please find attached invoice <strong>${data.invoiceNumber}</strong> for the amount of <span class="amount">€${data.totalAmount.toFixed(2)}</span>.</p>
    </div>

    <div class="invoice-details">
      <table>
        <tr>
          <td>Invoice Number:</td>
          <td><strong>${data.invoiceNumber}</strong></td>
        </tr>
        ${
          data.projectName
            ? `<tr>
          <td>Project:</td>
          <td><strong>${data.projectName}</strong></td>
        </tr>`
            : ''
        }
        <tr>
          <td>Invoice Date:</td>
          <td>${data.invoiceDate}</td>
        </tr>
        <tr>
          <td>Due Date:</td>
          <td><strong>${data.dueDate}</strong></td>
        </tr>
        <tr>
          <td>Total Amount:</td>
          <td><span class="amount">€${data.totalAmount.toFixed(2)}</span></td>
        </tr>
      </table>
    </div>

    <p>Payment is kindly requested by <strong>${data.dueDate}</strong>.</p>

    <p>If you have any questions regarding this invoice, please don't hesitate to contact me.</p>

    <div class="footer">
      <p>Best regards,</p>
      <div class="signature">
        <div class="signature-name">${signature.name}</div>
        ${signature.company ? `<div class="signature-line">${signature.company}</div>` : ''}
        ${signature.email ? `<div class="signature-line"><a href="mailto:${signature.email}">${signature.email}</a></div>` : ''}
        ${signature.phone ? `<div class="signature-line">${signature.phone}</div>` : ''}
        ${signature.website ? `<div class="signature-line"><a href="${signature.website}">${signature.website}</a></div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate email subject line for invoice
 */
export function generateInvoiceEmailSubject(invoiceNumber: string): string {
  return `Invoice ${invoiceNumber}`;
}
