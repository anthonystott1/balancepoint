// Default chart of accounts that every business starts with
import { supabase } from '../../lib/supabase';

export const DEFAULT_ACCOUNTS = [
  // ASSETS
  { account_number: "1000", name: "Cash & Bank Accounts", type: "asset", description: "Money in your checking accounts, savings accounts, and petty cash" },
  { account_number: "1100", name: "Accounts Receivable", type: "asset", description: "Payments you're waiting to receive from customers for products or services already delivered" },
  { account_number: "1200", name: "Inventory", type: "asset", description: "Products you have in stock that you plan to sell" },
  { account_number: "1300", name: "Property, Plant & Equipment", type: "asset", description: "Long-term items like computers, machinery, vehicles, and furniture used in your business" },
  // LIABILITIES
  { account_number: "2000", name: "Credit Cards", type: "liability", description: "Outstanding balances on business credit cards" },
  { account_number: "2100", name: "Accounts Payable", type: "liability", description: "Bills you need to pay to suppliers and service providers" },
  { account_number: "2200", name: "Loans", type: "liability", description: "Business loans from banks or other lenders" },
  { account_number: "2300", name: "Taxes Payable", type: "liability", description: "Taxes you owe but haven't paid yet" },
  // EQUITY
  { account_number: "3000", name: "Owner's Capital", type: "equity", description: "Money you've put into the business from your personal funds" },
  { account_number: "3100", name: "Retained Earnings", type: "equity", description: "Profits kept in the business rather than paid out to owners" },
  { account_number: "3200", name: "Owner's Drawings", type: "equity", description: "Money taken out of the business for personal use" },
  // INCOME
  { account_number: "4000", name: "Sales Revenue", type: "income", description: "Money earned from selling products or services" },
  { account_number: "4100", name: "Service Revenue", type: "income", description: "Money earned from providing services" },
  { account_number: "4200", name: "Other Income", type: "income", description: "Income from sources other than your main business activities" },
  // EXPENSES
  { account_number: "5000", name: "Cost of Goods Sold", type: "expense", description: "Direct costs to produce or purchase the products you sell" },
  { account_number: "5100", name: "Payroll & Benefits", type: "expense", description: "Wages, salaries, and employee benefits" },
  { account_number: "5200", name: "Rent", type: "expense", description: "Monthly rent for your office, store, or warehouse space" },
  { account_number: "5300", name: "Utilities", type: "expense", description: "Electricity, water, gas, phone, and internet bills" },
  { account_number: "5400", name: "Office Supplies", type: "expense", description: "Paper, pens, printer ink, and other everyday office items" },
  { account_number: "5500", name: "Marketing & Advertising", type: "expense", description: "Costs to promote your business" },
  { account_number: "5600", name: "Insurance", type: "expense", description: "Business insurance premiums" },
  { account_number: "5700", name: "Professional Services", type: "expense", description: "Fees for lawyers, accountants, consultants" },
  { account_number: "5800", name: "Software & Subscriptions", type: "expense", description: "Monthly software costs and online tools" },
  { account_number: "5900", name: "Travel & Meals", type: "expense", description: "Business travel, hotels, and business meal expenses" },
];

export async function createDefaultAccounts(businessId) {
  const accountsToCreate = DEFAULT_ACCOUNTS.map(account => ({
    business_id: businessId,
    account_number: account.account_number,
    name: account.name,
    type: account.type,
    description: account.description,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('accounts')
    .insert(accountsToCreate)
    .select();

  if (error) throw error;
  return data;
}