# Automation Apps Framework

This directory contains modular automation applications that extend the backoffice functionality.

## Architecture

Each app is self-contained and uses shared services from `/core`:

```
/apps                    - Automation applications (legacy)
  /[future-app]          - Additional automation apps

/core
  /llm                   - LLM service with LangFuse tracing
  /email                 - Email client (IMAP)
  /parsers               - Document parsing (PDF, OCR)
  /currency              - Currency conversion
  /pdf                   - PDF generation
  /queue                 - Job queue (future)
  /storage               - File storage (future)
```

## Current Implementation

Invoice ingestion is now handled by:
- **EmailManagementService** (`/server/services/EmailManagementService.ts`) - Email fetching & processing
- **EmailRepository** (`/server/repositories/EmailRepository.ts`) - Email data access
- **extractInvoiceFromPdf** (`/app/actions/extract-invoice.ts`) - AI-powered invoice extraction
- **API Route**: `/api/cron/fetch-emails` - Automated email fetching
- **Dashboard**: Email inbox with labeling workflow
- **Direct Upload**: `/expenses/new` page with PDF upload

See dashboard and expenses pages for active invoice processing workflows.

## Creating New Apps

1. Create new directory in `/apps/[app-name]/`
2. Implement `[AppName]App.ts` with your logic
3. Create `routes.ts` for API endpoints
4. Register routes in `server.js`
5. Use shared services from `/core`

## Core Services

### LLM Service
```typescript
import { LLMService } from '../core/llm/LLMService';

const llm = new LLMService();
const result = await llm.call('Extract invoice data...', {
  traceName: 'extract-invoice',
  metadata: { app: 'invoice-ingestion' }
});
```

### Email Service
```typescript
import { EmailService } from '../core/email/EmailService';

const email = new EmailService();
const emails = await email.fetchEmails({
  hasAttachment: true,
  subject: 'invoice'
});
```

### Document Parser
```typescript
import { DocumentParser } from '../core/parsers/DocumentParser';

const parser = new DocumentParser();
const result = await parser.parsePDF(buffer);
```

## LangFuse Integration

All LLM calls are automatically traced when `LANGFUSE_ENABLED=true`:
- View traces at https://cloud.langfuse.com
- Monitor costs, latency, and quality
- Debug prompt/response issues
