import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

// Filter transactions by date range
export function filterTransactionsByDate(transactions, startDate, endDate) {
  return transactions.filter(tx => {
    const txDate = new Date(tx.transaction_date);
    return txDate >= new Date(startDate) && txDate <= new Date(endDate);
  });
}

// Get all transaction lines for a set of transactions
export function getTransactionLines(transactionLines, transactionIds) {
  return transactionLines.filter(line => transactionIds.includes(line.transaction_id));
}

// Calculate account balances by type
export function calculateAccountBalances(accounts, transactionLines) {
  const balances = {};
  
  accounts.forEach(account => {
    balances[account.id] = {
      account,
      debit: 0,
      credit: 0,
      balance: 0
    };
  });

  transactionLines.forEach(line => {
    if (balances[line.account_id]) {
      balances[line.account_id].debit += line.debit_amount || 0;
      balances[line.account_id].credit += line.credit_amount || 0;
    }
  });

  // Calculate final balance based on account type
  Object.values(balances).forEach(item => {
    const { account, debit, credit } = item;
    
    // Assets and Expenses increase with debits
    if (account.type === 'asset' || account.type === 'expense') {
      item.balance = debit - credit;
    }
    // Liabilities, Equity, and Income increase with credits
    else {
      item.balance = credit - debit;
    }
  });

  return balances;
}

// Group accounts by type
export function groupAccountsByType(accounts) {
  const groups = {
    asset: [],
    liability: [],
    equity: [],
    income: [],
    expense: []
  };

  accounts.forEach(account => {
    if (groups[account.type]) {
      groups[account.type].push(account);
    }
  });

  return groups;
}

// Calculate Profit & Loss
export function calculateProfitLoss(accounts, transactionLines, transactions, startDate, endDate) {
  // Filter transactions by date
  const periodTransactions = filterTransactionsByDate(transactions, startDate, endDate);
  const txIds = periodTransactions.map(tx => tx.id);
  
  // Get relevant transaction lines
  const periodLines = getTransactionLines(transactionLines, txIds);
  
  // Calculate balances
  const balances = calculateAccountBalances(accounts, periodLines);
  
  // Separate income and expense accounts
  const incomeAccounts = accounts.filter(a => a.type === 'income');
  const expenseAccounts = accounts.filter(a => a.type === 'expense');
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  const incomeDetails = incomeAccounts.map(account => {
    const balance = balances[account.id]?.balance || 0;
    totalIncome += balance;
    return {
      account,
      amount: balance
    };
  }).filter(item => item.amount !== 0);
  
  const expenseDetails = expenseAccounts.map(account => {
    const balance = balances[account.id]?.balance || 0;
    totalExpenses += balance;
    return {
      account,
      amount: balance
    };
  }).filter(item => item.amount !== 0);
  
  const netProfit = totalIncome - totalExpenses;
  
  return {
    totalIncome,
    totalExpenses,
    netProfit,
    incomeDetails,
    expenseDetails
  };
}

// Calculate Balance Sheet
export function calculateBalanceSheet(accounts, transactionLines, transactions, asOfDate) {
  // Get all transactions up to the specified date
  const historicalTransactions = transactions.filter(tx => 
    new Date(tx.transaction_date) <= new Date(asOfDate)
  );
  const txIds = historicalTransactions.map(tx => tx.id);
  
  // Get relevant transaction lines
  const historicalLines = getTransactionLines(transactionLines, txIds);
  
  // Calculate balances
  const balances = calculateAccountBalances(accounts, historicalLines);
  
  // Separate by type
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const liabilityAccounts = accounts.filter(a => a.type === 'liability');
  const equityAccounts = accounts.filter(a => a.type === 'equity');
  
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  
  const assetDetails = assetAccounts.map(account => {
    const balance = balances[account.id]?.balance || 0;
    totalAssets += balance;
    return { account, amount: balance };
  }).filter(item => item.amount !== 0);
  
  const liabilityDetails = liabilityAccounts.map(account => {
    const balance = balances[account.id]?.balance || 0;
    totalLiabilities += balance;
    return { account, amount: balance };
  }).filter(item => item.amount !== 0);
  
  const equityDetails = equityAccounts.map(account => {
    const balance = balances[account.id]?.balance || 0;
    totalEquity += balance;
    return { account, amount: balance };
  }).filter(item => item.amount !== 0);
  
  const netWorth = totalAssets - totalLiabilities;
  
  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    netWorth,
    assetDetails,
    liabilityDetails,
    equityDetails
  };
}

// Calculate Cash Flow
export function calculateCashFlow(accounts, transactionLines, transactions, startDate, endDate) {
  // Filter transactions by date
  const periodTransactions = filterTransactionsByDate(transactions, startDate, endDate);
  const txIds = periodTransactions.map(tx => tx.id);
  
  // Get relevant transaction lines
  const periodLines = getTransactionLines(transactionLines, txIds);
  
  // Get cash/bank accounts
  const cashAccounts = accounts.filter(a => 
    a.type === 'asset' && (
      a.name.toLowerCase().includes('cash') ||
      a.name.toLowerCase().includes('bank') ||
      a.name.toLowerCase().includes('checking')
    )
  );
  const cashAccountIds = cashAccounts.map(a => a.id);
  
  // Calculate cash movements
  let cashIn = 0;
  let cashOut = 0;
  
  const movements = [];
  
  periodLines.forEach(line => {
    if (cashAccountIds.includes(line.account_id)) {
      const amount = (line.debit_amount || 0) - (line.credit_amount || 0);
      
      if (amount > 0) {
        cashIn += amount;
      } else {
        cashOut += Math.abs(amount);
      }
      
      movements.push({
        transaction_id: line.transaction_id,
        account_id: line.account_id,
        amount
      });
    }
  });
  
  const netCashFlow = cashIn - cashOut;
  
  return {
    cashIn,
    cashOut,
    netCashFlow,
    movements
  };
}
