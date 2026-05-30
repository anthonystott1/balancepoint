// src/utils.js
// Central place for shared utilities

const PAGE_URLS = {
  Dashboard:             '/dashboard',
  BankAccounts:          '/bank-accounts',
  Transactions:          '/transactions',
  Budgets:               '/budgets',
  RecurringTransactions: '/recurring-transactions',
  Receipts:              '/receipts',
  Invoices:              '/invoices',
  Contractors:           '/contractors',
  Reports:               '/reports',
  Reconciliation:        '/reconciliation',
  Loans:                 '/loans',
  OwnerEquity:           '/owner-equity',
  ChartOfAccounts:       '/chart-of-accounts',
  TeamManagement:        '/team',
  BusinessSettings:      '/settings',
  BusinessSetup:         '/business-setup',
};

/**
 * Returns the URL path for a given page name.
 * Usage: createPageUrl('Dashboard') → '/dashboard'
 */
export function createPageUrl(pageName) {
  return PAGE_URLS[pageName] ?? '/';
}
