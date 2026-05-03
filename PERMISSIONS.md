# Permission System

The app has a **3-layer permission system** for security:

## 1. Database RLS (Row Level Security)
- ✅ **Enforced**: All tables have RLS enabled
- ✅ **Server-side only**: Cannot be bypassed by client
- Location: `supabase/migrations/20260417000000_comprehensive_rbac.sql`

### RLS Policies:
- Anonymous users: **NO ACCESS** to any backoffice data
- Authenticated users: Access based on `user_profiles.role`
- Service role: Bypasses RLS (admin operations only)

## 2. Middleware (Route Protection)
- ✅ **Enforced**: All routes except `/login`, `/auth/*`, `/api/*`
- Location: `middleware.ts`

### Middleware Flow:
1. Check if user has valid session
2. If no session → redirect to `/login`
3. Fetch user's role from `user_profiles`
4. If role not in `['accountant', 'editor', 'admin', 'riemer']` → sign out + redirect to `/login`
5. If authorized → attach role to response headers

## 3. Application Permissions (UI/UX)
- ✅ **Helper functions**: Check permissions in components
- Location: `lib/permissions.ts` (shared), `lib/server/permissions.ts` (server), `src/hooks/usePermissions.ts` (client)

### Role Hierarchy:

| Role | Access Level | Permissions |
|------|--------------|-------------|
| **viewer** | None | No backoffice access (blocked by middleware) |
| **accountant** | Read-only | View all data, cannot edit anything |
| **editor** | Edit clients/projects | Edit companies, contacts, projects, time entries |
| **admin** | Manage financials | All editor permissions + edit invoices, expenses, emails |
| **riemer** | Full access | Everything including user management, tax config, business info |

### Detailed Permissions:

```typescript
// Data Access
canViewBackoffice     // accountant+
canViewFinancials     // accountant+

// Edit Permissions
canEditClients        // editor+
canEditProjects       // editor+
canEditTimeEntries    // editor+
canEditInvoices       // admin+ only
canEditExpenses       // admin+ only
canEditEmails         // admin+ only

// Admin Permissions
canManageUsers        // riemer only
canEditTaxConfig      // riemer only
canEditBusinessInfo   // riemer only
```

## Usage

### Client-Side (React Components)

```tsx
import { usePermissions } from '@/src/hooks/usePermissions';

export function MyComponent() {
  const permissions = usePermissions();

  if (permissions.isLoading) {
    return <div>Loading...</div>;
  }

  if (!permissions.canEditInvoices) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      {permissions.canEditInvoices && (
        <button>Edit Invoice</button>
      )}
    </div>
  );
}
```

### Server-Side (Server Components / Actions)

```tsx
import { requireFinancialEdit, getCurrentUserPermissions } from '@/lib/server/permissions';

// In a Server Component
export default async function InvoicePage() {
  const permissions = await getCurrentUserPermissions();

  if (!permissions || !permissions.canViewFinancials) {
    redirect('/login');
  }

  return <InvoiceList canEdit={permissions.canEditInvoices} />;
}

// In a Server Action
export async function updateInvoice(id: number, data: InvoiceData) {
  'use server';

  // Throws if user doesn't have permission
  await requireFinancialEdit();

  // Your update logic here...
}
```

### Helper Functions

```typescript
import { hasBackofficeAccess, canWriteData, canManageFinancials } from '@/lib/permissions';

const role = 'editor';

hasBackofficeAccess(role);     // true (editor can access backoffice)
canWriteData(role);            // true (editor can write clients/projects)
canManageFinancials(role);     // false (only admin+ can manage financials)
```

## Security Best Practices

1. ✅ **Always rely on RLS** - UI permissions are UX only, not security
2. ✅ **Use server-side checks** - For Server Actions and mutations
3. ✅ **Never expose service role key** - Only use server-side
4. ✅ **Middleware is first line of defense** - Blocks unauthorized routes
5. ✅ **Permission checks are redundant** - Database RLS is the final enforcer

## Adding New Permissions

1. Update `lib/permissions.ts` interface
2. Update `getPermissionsForRole()` for each role
3. Update RLS policies in database if needed
4. Use in components/actions as needed

## Current Users

- **riemer@riemer.fyi** - Role: `riemer` (full access)
- To create more users: `npx tsx scripts/create-admin-user.ts email password`
