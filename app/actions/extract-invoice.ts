'use server';

import { DocumentParser } from '@/server/core/parsers/DocumentParser';
import { LLMService } from '@/server/core/llm/LLMService';

const INVOICE_SCHEMA = `{
  "supplier_name": "string (company/supplier name)",
  "invoice_date": "string (YYYY-MM-DD format)",
  "total_amount": "number (total amount including VAT)",
  "tax_amount": "number (VAT amount if specified)",
  "subtotal": "number (amount before VAT)",
  "description": "string (brief description)",
  "invoice_number": "string (invoice/reference number if present)",
  "currency": "string (3-letter ISO currency code like EUR, USD, GBP)",
  "language": "string (2-letter ISO language code like en, nl, fr)"
}`;

type ExtractedInvoiceData = {
  supplier_name?: string;
  invoice_date?: string;
  total_amount?: number;
  tax_amount?: number;
  subtotal?: number;
  description?: string;
  invoice_number?: string;
  currency?: string;
  language?: string;
};

/**
 * Shared extraction logic used by both manual PDF upload and email ingestion
 * Supports PDFs and images (images require OCR - shows warning if empty)
 */
export async function extractInvoiceFromPdf(
  fileBase64: string,
  emailContext?: {
    subject?: string;
    from?: string;
    body?: string;
  }
): Promise<{ success: true; data: ExtractedInvoiceData } | { success: false; error: string }> {
  try {
    const documentParser = new DocumentParser();
    const llmService = new LLMService();

    // Parse document to text (PDF or image)
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Detect file type from buffer signature
    let mimeType = 'application/pdf';
    if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
      mimeType = 'image/jpeg';
    } else if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50) {
      mimeType = 'image/png';
    }

    const parsed = await documentParser.parse(fileBuffer, mimeType);

    // Warn if OCR returned empty (image without OCR implementation)
    if (!parsed.text.trim() && mimeType.startsWith('image/')) {
      return {
        success: false,
        error: 'OCR for images is not yet implemented. Please upload a PDF or manually enter the data.'
      };
    }

    // Build context with email metadata if available
    let fullContext = parsed.text;
    if (emailContext) {
      fullContext = `EMAIL CONTEXT:
Subject: ${emailContext.subject || '(no subject)'}
From: ${emailContext.from || '(unknown)'}
Body: ${emailContext.body || '(no body)'}

INVOICE DOCUMENT:
${parsed.text}`;
    }

    // Extract structured data using LLM
    const extractedData = await llmService.extractStructured(
      fullContext,
      INVOICE_SCHEMA
    );

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('❌ Invoice extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
