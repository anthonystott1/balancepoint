// Accounting terminology with plain-English explanations
export const ACCOUNTING_TERMS = {
  'chart_of_accounts': {
    term: 'Chart of Accounts',
    explanation: 'Your complete list of categories for organizing money. Think of it as the filing system for all your transactions.'
  },
  'debit': {
    term: 'Debit',
    explanation: 'Money coming into an account, or an increase in assets/expenses. In double-entry accounting, every debit has a matching credit.'
  },
  'credit': {
    term: 'Credit',
    explanation: 'Money going out of an account, or an increase in liabilities/income. In double-entry accounting, every credit has a matching debit.'
  },
  'double_entry': {
    term: 'Double-Entry Accounting',
    explanation: 'Every transaction affects at least two accounts - one debit and one credit. This keeps your books balanced and provides built-in error checking.'
  },
  'assets': {
    term: 'Assets',
    explanation: 'Things your business owns that have value: cash, equipment, inventory, money owed to you, etc. Assets = what you have.'
  },
  'liabilities': {
    term: 'Liabilities',
    explanation: 'Money your business owes to others: loans, unpaid bills, credit card balances. Liabilities = what you owe.'
  },
  'equity': {
    term: 'Equity',
    explanation: 'The owner\'s stake in the business. Calculated as Assets - Liabilities. This is what\'s left if you sold everything and paid all debts.'
  },
  'income': {
    term: 'Income',
    explanation: 'Money your business earns from sales, services, or other sources. Also called revenue. This increases equity.'
  },
  'revenue': {
    term: 'Revenue',
    explanation: 'Money your business earns from sales, services, or other sources. Also called income. This increases equity.'
  },
  'expenses': {
    term: 'Expenses',
    explanation: 'Costs of running your business: rent, salaries, supplies, utilities, etc. These reduce your profit and equity.'
  },
  'accounts_payable': {
    term: 'Accounts Payable',
    explanation: 'Money you owe to vendors and suppliers. These are bills you haven\'t paid yet.'
  },
  'accounts_receivable': {
    term: 'Accounts Receivable',
    explanation: 'Money customers owe you. These are invoices you\'ve sent but haven\'t been paid yet.'
  },
  'general_ledger': {
    term: 'General Ledger',
    explanation: 'The complete record of all your transactions, organized by account. This is the master source of truth for your books.'
  },
  'trial_balance': {
    term: 'Trial Balance',
    explanation: 'A report showing all account balances to verify debits equal credits. It\'s a quick check that your books are balanced.'
  },
  'cash_basis': {
    term: 'Cash Basis Accounting',
    explanation: 'Count income when you receive it and expenses when you pay them. Simple and matches your bank account, but doesn\'t show what you owe or are owed.'
  },
  'accrual_basis': {
    term: 'Accrual Basis Accounting',
    explanation: 'Count income when you earn it and expenses when you incur them, regardless of when money actually moves. Required for most businesses over $25M in revenue.'
  },
  'fiscal_year': {
    term: 'Fiscal Year',
    explanation: 'Your business\'s 12-month accounting period. It can match the calendar year (Jan-Dec) or use a different cycle that fits your business better.'
  },
  'reconciliation': {
    term: 'Bank Reconciliation',
    explanation: 'Matching your accounting records to your bank statement to catch errors, missing transactions, or fraud. Should be done monthly.'
  },
  'cleared': {
    term: 'Cleared Transaction',
    explanation: 'A transaction that has been processed by the bank and appears on your bank statement. Uncleared transactions are pending.'
  },
  'posting': {
    term: 'Posting',
    explanation: 'Recording a transaction to the general ledger. Once posted, a transaction affects your account balances and reports.'
  },
  'exchange_rate': {
    term: 'Exchange Rate',
    explanation: 'The rate used to convert foreign currency to your base currency. Captured at transaction time so historical amounts don\'t change.'
  },
  'base_currency': {
    term: 'Base Currency',
    explanation: 'The primary currency for your business. All reports and account balances are shown in this currency, even if transactions are entered in foreign currencies.'
  },
  'tags': {
    term: 'Tags',
    explanation: 'Labels you can add to transactions to track projects, clients, departments, or locations. They don\'t affect account balances, just help you organize and report on groups of transactions.'
  },
  'account_type': {
    term: 'Account Type',
    explanation: 'The category of an account (Asset, Liability, Equity, Income, or Expense). This determines how the account behaves in financial reports and the accounting equation.'
  },
  'cogs': {
    term: 'Cost of Goods Sold (COGS)',
    explanation: 'Direct costs of producing what you sell: materials, labor, shipping. Subtract COGS from revenue to get gross profit.'
  },
  'retained_earnings': {
    term: 'Retained Earnings',
    explanation: 'Profits your business has kept (not paid out to owners). This account grows when you make profit and shrinks when you take distributions.'
  },
  'owner_draws': {
    term: 'Owner Draws',
    explanation: 'Money the owner takes out of the business. This reduces equity but is not an expense - it\'s a distribution of profits.'
  }
};
