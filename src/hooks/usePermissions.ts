import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

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
  isLoading: boolean;
}

const getRolePermissions = (role: UserRole | null): Permissions => {
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
      isLoading: false,
    };
  }

  const basePermissions = {
    role,
    isLoading: false,
  };

  switch (role) {
    case 'riemer':
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
        canManageUsers: false, // Only riemer can manage users
        canEditTaxConfig: false, // Only riemer can edit tax config
        canEditBusinessInfo: false, // Only riemer can edit business info
      };

    case 'editor':
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
      return {
        ...basePermissions,
        canViewBackoffice: true,
        canViewFinancials: true,
        canEditClients: false, // Read-only access
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
};

export const usePermissions = (): Permissions => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setRole(null);
          setIsLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        setRole(profileData ? ((profileData as any).role as UserRole) : null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return {
    ...getRolePermissions(role),
    isLoading,
  };
};
