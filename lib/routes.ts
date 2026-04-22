/**
 * Centralized route configuration for type-safe navigation
 * Use these instead of hardcoded strings for better refactoring and consistency
 */

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',

  companies: {
    list: '/companies',
    detail: (id: number | string) => `/companies/${id}`,
    create: '/companies/create',
    edit: (id: number | string) => `/companies/${id}/edit`,
  },

  contacts: {
    list: '/contacts',
    detail: (id: number | string) => `/contacts/${id}`,
    create: '/contacts/create',
    edit: (id: number | string) => `/contacts/${id}/edit`,
  },

  projects: {
    list: '/projects',
    detail: (id: number | string) => `/projects/${id}`,
    create: '/projects/create',
    edit: (id: number | string) => `/projects/${id}/edit`,
  },

  invoices: {
    list: '/invoices',
    detail: (id: number | string) => `/invoices/${id}`,
    create: '/invoices/new',
    edit: (id: number | string) => `/invoices/${id}/edit`,
  },

  expenses: {
    list: '/expenses',
    detail: (id: number | string) => `/expenses/${id}`,
    create: '/expenses/new',
    edit: (id: number | string) => `/expenses/${id}/edit`,
  },

  timeEntries: {
    list: '/time-entries',
  },

  emails: {
    detail: (id: number | string) => `/emails/${id}`,
  },

  money: {
    overview: '/money',
    vat: '/money/vat',
    tax: '/money/tax',
  },

  taxes: '/taxes',
  taxConfiguration: '/tax-configuration',
  btwDeclaration: '/btw-declaration',
  reports: '/reports',
} as const

/**
 * Helper to navigate to entity detail page
 */
export function getEntityDetailRoute(entity: string, id: number | string): string {
  return `/${entity}/${id}`
}

/**
 * Helper to navigate to entity edit page
 */
export function getEntityEditRoute(entity: string, id: number | string): string {
  return `/${entity}/${id}/edit`
}
