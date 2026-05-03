/**
 * Server-side permission helpers
 * Use in Server Components, Server Actions, and Route Handlers
 */

import { createClient } from '@/lib/supabase/server';
import { getPermissionsForRole, type UserRole, type Permissions } from '@/lib/permissions';

/**
 * Get current user's permissions from server session
 * Returns null if not authenticated
 */
export async function getCurrentUserPermissions(): Promise<(Permissions & { userId: string }) | null> {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  const role = profile?.role as UserRole | null;

  return {
    ...getPermissionsForRole(role),
    userId: session.user.id,
  };
}

/**
 * Require specific permission or throw
 * Use in Server Actions to enforce permissions
 */
export async function requirePermission(
  check: (permissions: Permissions) => boolean,
  errorMessage = 'Permission denied'
): Promise<Permissions & { userId: string }> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    throw new Error('Authentication required');
  }

  if (!check(permissions)) {
    throw new Error(errorMessage);
  }

  return permissions;
}

/**
 * Common permission checks
 */
export async function requireBackofficeAccess() {
  return requirePermission(
    (p) => p.canViewBackoffice,
    'Backoffice access required'
  );
}

export async function requireFinancialAccess() {
  return requirePermission(
    (p) => p.canViewFinancials,
    'Financial data access required'
  );
}

export async function requireEditPermission() {
  return requirePermission(
    (p) => p.canEditClients || p.canEditProjects || p.canEditTimeEntries,
    'Edit permission required'
  );
}

export async function requireFinancialEdit() {
  return requirePermission(
    (p) => p.canEditInvoices || p.canEditExpenses,
    'Financial edit permission required'
  );
}

export async function requireAdminAccess() {
  return requirePermission(
    (p) => p.role === 'admin' || p.role === 'riemer',
    'Admin access required'
  );
}

export async function requireRiemerAccess() {
  return requirePermission(
    (p) => p.role === 'riemer',
    'Riemer access required'
  );
}
