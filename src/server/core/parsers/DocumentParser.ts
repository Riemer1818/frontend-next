// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

export interface ParsedDocument {
  text: string;
  pageCount: number;
  metadata?: Record<string, any>;
}

/**
 * Document parsing service
 * Handles PDF, images (via OCR), and text extraction
 */
export class DocumentParser {
  /**
   * Parse a PDF document
   */
  async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();

    return {
      text: data.text,
      pageCount: data.total,
      metadata: {},
    };
  }

  /**
   * Parse an image using Claude's vision capabilities
   */
  async parseImage(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    // Convert buffer to base64
    const base64Image = buffer.toString('base64');

    // Use Claude's vision to extract text from the image
    const { LLMService } = await import('../llm/LLMService');
    const llmService = new LLMService();

    try {
      const extractedText = await llmService.extractTextFromImage(base64Image, mimeType);

      return {
        text: extractedText,
        pageCount: 1,
        metadata: { mimeType },
      };
    } catch (error) {
      console.error('Failed to extract text from image:', error);
      return {
        text: '',
        pageCount: 1,
        metadata: { mimeType, error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Auto-detect document type and parse accordingly
   */
  async parse(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    if (mimeType === 'application/pdf') {
      return this.parsePDF(buffer);
    }

    if (mimeType.startsWith('image/')) {
      return this.parseImage(buffer, mimeType);
    }

    throw new Error(`Unsupported document type: ${mimeType}`);
  }
}
