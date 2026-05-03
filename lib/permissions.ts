/**
 * Centralized permissions system
 * Mirrors RLS policies but provides type-safe client/server permission checks
 */

export type UserRole = 'viewer' | 'accountant' | 'editor' | 'admin' | 'riemer';

export interface Permissions {
  // Data access
  canViewBackoffice: boolean;
  canViewFinancials: boolean;

  // Write permissions
  canEditClients: boolean;
  canEditProjects: boolean;
  canEditTimeEntries: boolean;
  canEditInvoices: boolean;
  canEditExpenses: boolean;
  canEditEmails: boolean;

  // Admin permissions
  canManageUsers: boolean;
  canEditTaxConfig: boolean;
  canEditBusinessInfo: boolean;

  // Current role
  role: UserRole | null;
}

/**
 * Get permissions for a given role
 * This mirrors the RLS policies defined in the database
 */
export function getPermissionsForRole(role: UserRole | null): Permissions {
  if (!role) {
    return {
      canViewBackoffice: false,
      canViewFinancials: false,
      canEditClients: false,
      canEditProjects: false,
      canEditTimeEntries: false,
      canEditInvoices: false,
      canEditExpenses: false,
      canEditEmails: false,
      canManageUsers: false,
      canEditTaxConfig: false,
      canEditBusinessInfo: false,
      role: null,
    };
  }

  const basePermissions = { role };

  switch (role) {
    case 'riemer':
      // Full access to everything
      return {
        ...basePermissions,
        canViewBackoffice: true,
        canViewFinancials: true,
        canEditClients: true,
        canEditProjects: true,
        canEditTimeEntries: true,
        canEditInvoices: true,
        canEditExpenses: true,
        canEditEmails: true,
        canManageUsers: true,
        canEditTaxConfig: true,
        canEditBusinessInfo: true,
      };

    case 'admin':
      // Can manage financials, but not users/tax config
      return {
        ...basePermissions,
        canViewBackoffice: true,
        canViewFinancials: true,
        canEditClients: true,
        canEditProjects: true,
        canEditTimeEntries: true,
        canEditInvoices: true,
        canEditExpenses: true,
        canEditEmails: true,
        canManageUsers: false, // Only riemer
        canEditTaxConfig: false, // Only riemer
        canEditBusinessInfo: false, // Only riemer
      };

    case 'editor':
      // Can edit clients/projects/time, but not financials
      return {
        ...basePermissions,
        canViewBackoffice: true,
        canViewFinancials: true, // Can view but not edit
        canEditClients: true,
        canEditProjects: true,
        canEditTimeEntries: true,
        canEditInvoices: false, // Cannot edit financials
        canEditExpenses: false,
        canEditEmails: false,
        canManageUsers: false,
        canEditTaxConfig: false,
        canEditBusinessInfo: false,
      };

    case 'accountant':
      // Read-only access to all data
      return {
        ...basePermissions,
        canViewBackoffice: true,
        canViewFinancials: true,
        canEditClients: false,
        canEditProjects: false,
        canEditTimeEntries: false,
        canEditInvoices: false,
        canEditExpenses: false,
        canEditEmails: false,
        canManageUsers: false,
        canEditTaxConfig: false,
        canEditBusinessInfo: false,
      };

    case 'viewer':
    default:
      // No backoffice access
      return {
        ...basePermissions,
        canViewBackoffice: false,
        canViewFinancials: false,
        canEditClients: false,
        canEditProjects: false,
        canEditTimeEntries: false,
        canEditInvoices: false,
        canEditExpenses: false,
        canEditEmails: false,
        canManageUsers: false,
        canEditTaxConfig: false,
        canEditBusinessInfo: false,
      };
  }
}

/**
 * Role hierarchy helpers
 */
export const BACKOFFICE_ROLES: UserRole[] = ['accountant', 'editor', 'admin', 'riemer'];
export const FINANCIAL_WRITE_ROLES: UserRole[] = ['admin', 'riemer'];
export const DATA_WRITE_ROLES: UserRole[] = ['editor', 'admin', 'riemer'];

export function hasBackofficeAccess(role: UserRole | null): boolean {
  return role !== null && BACKOFFICE_ROLES.includes(role);
}

export function canWriteData(role: UserRole | null): boolean {
  return role !== null && DATA_WRITE_ROLES.includes(role);
}

export function canManageFinancials(role: UserRole | null): boolean {
  return role !== null && FINANCIAL_WRITE_ROLES.includes(role);
}
