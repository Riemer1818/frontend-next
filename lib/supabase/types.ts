/**
 * Base types for all Supabase entities
 *
 * This file defines the core type hierarchy for the application:
 * - Entity: Base type for all database entities (companies, contacts, projects, etc.)
 * - Document: Base type for document-like entities (emails, invoices, etc.)
 */

/**
 * Base Entity type - all database entities extend from this
 */
export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Entity with active status tracking
 */
export interface ActiveEntity extends BaseEntity {
  is_active: boolean;
}

/**
 * Entity with notes/description field
 */
export interface NotableEntity extends BaseEntity {
  notes?: string | null;
}

/**
 * Contact information mixin
 */
export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
}

/**
 * Address information mixin
 */
export interface AddressInfo {
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * Person-like entity (contacts, users, etc.)
 */
export interface PersonEntity extends ActiveEntity, ContactInfo, NotableEntity {
  first_name: string;
  last_name?: string | null;
}

/**
 * Organization-like entity (companies, suppliers, clients)
 */
export interface OrganizationEntity extends ActiveEntity, ContactInfo, AddressInfo, NotableEntity {
  name: string;
}

/**
 * Business identifiers for Dutch entities
 */
export interface DutchBusinessInfo {
  kvk_number?: string | null;  // KVK (Chamber of Commerce number)
  btw_number?: string | null;  // BTW/VAT number
  iban?: string | null;         // Bank account
}

/**
 * Document base type (emails, invoices, expenses, etc.)
 */
export interface DocumentEntity extends BaseEntity {
  // Documents typically have a date they were created/received/sent
  document_date?: string | null;

  // Many documents can be linked to companies and contacts
  linked_company_id?: number | null;
  linked_contact_id?: number | null;

  // Documents often have attachments
  has_attachments?: boolean;
  attachment_count?: number;
}

/**
 * Financial document (invoices, expenses)
 */
export interface FinancialDocument extends DocumentEntity {
  total_amount: number;
  currency?: string;
  tax_rate?: number;
}

/**
 * Document with processing status
 */
export interface ProcessableDocument extends DocumentEntity {
  is_processed?: boolean;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string | null;
  processed_at?: string | null;
}
