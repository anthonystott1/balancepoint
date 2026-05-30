// Loan calculation utilities

export function calculateMonthlyPayment(principal, annualRate, termMonths) {
  if (annualRate === 0) {
    return principal / termMonths;
  }
  
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return payment;
}

export function generateAmortizationSchedule(principal, annualRate, termMonths, startDate, frequency = 'monthly') {
  const schedule = [];
  const monthlyRate = annualRate / 100 / 12;
  const payment = calculateMonthlyPayment(principal, annualRate, termMonths);
  
  let balance = principal;
  let currentDate = new Date(startDate);
  
  // Calculate frequency multiplier
  const frequencyMap = {
    'weekly': 0.23, // ~1 week
    'bi-weekly': 0.5, // ~2 weeks  
    'monthly': 1
  };
  const monthIncrement = frequencyMap[frequency] || 1;
  
  for (let i = 1; i <= termMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = payment - interestPayment;
    balance -= principalPayment;
    
    // Handle rounding on last payment
    if (i === termMonths && balance < 1) {
      balance = 0;
    }
    
    schedule.push({
      payment_number: i,
      payment_date: new Date(currentDate),
      payment_amount: payment,
      principal_portion: principalPayment,
      interest_portion: interestPayment,
      remaining_balance: Math.max(0, balance)
    });
    
    // Increment date based on frequency
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + monthIncrement);
  }
  
  return schedule;
}

export function calculateSimpleInterest(principal, annualRate, days) {
  return (principal * (annualRate / 100) * days) / 365;
}

export function calculatePaymentSplit(loan, paymentAmount, paymentDate) {
  if (loan.interest_method === 'simple') {
    // Simple interest: calculate interest on current balance
    const daysSinceLastPayment = 30; // Simplified - would calculate from last payment
    const interest = calculateSimpleInterest(loan.current_balance, loan.interest_rate, daysSinceLastPayment);
    const principal = paymentAmount - interest;
    
    return {
      interest_portion: Math.max(0, interest),
      principal_portion: Math.max(0, principal)
    };
  } else {
    // Amortized: use schedule to determine split
    const monthlyRate = loan.interest_rate / 100 / 12;
    const interest = loan.current_balance * monthlyRate;
    const principal = paymentAmount - interest;
    
    return {
      interest_portion: Math.max(0, interest),
      principal_portion: Math.max(0, principal)
    };
  }
}

export function calculatePayoffAmount(loan, payoffDate = new Date()) {
  const monthlyRate = loan.interest_rate / 100 / 12;
  const accruedInterest = loan.current_balance * monthlyRate;
  
  return {
    principal: loan.current_balance,
    accrued_interest: accruedInterest,
    total: loan.current_balance + accruedInterest
  };
}

export function getNextPaymentDate(startDate, frequency, paymentsReceived) {
  const date = new Date(startDate);
  
  const frequencyMap = {
    'weekly': 7,
    'bi-weekly': 14,
    'monthly': 30
  };
  
  const daysToAdd = (frequencyMap[frequency] || 30) * paymentsReceived;
  date.setDate(date.getDate() + daysToAdd);
  
  return date;
}

export function isPaymentLate(nextPaymentDate, gracePeriodDays = 0) {
  const today = new Date();
  const dueDate = new Date(nextPaymentDate);
  dueDate.setDate(dueDate.getDate() + gracePeriodDays);
  
  return today > dueDate;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatPercent(rate) {
  return `${rate.toFixed(2)}%`;
}
