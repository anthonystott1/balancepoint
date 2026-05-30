import React, { useState } from 'react';
// base44 removed
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, HandCoins, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import LoanWizard from '@/components/loans/LoanWizard';
import LoanCard from '@/components/loans/LoanCard';
import PaymentForm from '@/components/loans/PaymentForm';
import AmortizationSchedule from '@/components/loans/AmortizationSchedule';
import { formatCurrency } from '@/components/loans/loanCalculations';
import { getNextPaymentDate } from '@/components/loans/loanCalculations';

function LoansContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Fetch loans
  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', currentBusiness?.id],
    queryFn: () => base44.entities.Loan.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  // Create loan mutation
  const createLoanMutation = useMutation({
    mutationFn: async (loanData) => {
      const loan = await base44.entities.Loan.create({
        ...loanData,
        business_id: currentBusiness.id,
        next_payment_date: getNextPaymentDate(loanData.start_date, loanData.payment_frequency, 1)
      });
      
      // Create initial transaction for loan disbursement if needed
      // This would debit the loan receivable and credit cash
      return loan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentBusiness.id] });
      setIsWizardOpen(false);
    }
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Create payment record
      const payment = await base44.entities.LoanPayment.create({
        ...paymentData,
        business_id: currentBusiness.id,
        loan_id: selectedLoan.id
      });

      // Create transactions for principal
      if (paymentData.principal_portion > 0) {
        const principalTx = await base44.entities.Transaction.create({
          business_id: currentBusiness.id,
          transaction_date: paymentData.payment_date,
          description: `Loan payment - Principal (${selectedLoan.borrower_name})`,
          amount: paymentData.principal_portion,
          source: 'manual',
          reference_number: paymentData.reference_number
        });

        // Create transaction lines
        await base44.entities.TransactionLine.bulkCreate([
          {
            transaction_id: principalTx.id,
            business_id: currentBusiness.id,
            account_id: paymentData.bank_account_id,
            debit_amount: paymentData.principal_portion,
            credit_amount: 0
          },
          {
            transaction_id: principalTx.id,
            business_id: currentBusiness.id,
            account_id: selectedLoan.loan_receivable_account_id,
            debit_amount: 0,
            credit_amount: paymentData.principal_portion
          }
        ]);

        // Update payment with transaction ID
        await base44.entities.LoanPayment.update(payment.id, {
          principal_transaction_id: principalTx.id
        });
      }

      // Create transaction for interest
      if (paymentData.interest_portion > 0) {
        const interestTx = await base44.entities.Transaction.create({
          business_id: currentBusiness.id,
          transaction_date: paymentData.payment_date,
          description: `Loan payment - Interest (${selectedLoan.borrower_name})`,
          amount: paymentData.interest_portion,
          source: 'manual',
          reference_number: paymentData.reference_number
        });

        await base44.entities.TransactionLine.bulkCreate([
          {
            transaction_id: interestTx.id,
            business_id: currentBusiness.id,
            account_id: paymentData.bank_account_id,
            debit_amount: paymentData.interest_portion,
            credit_amount: 0
          },
          {
            transaction_id: interestTx.id,
            business_id: currentBusiness.id,
            account_id: selectedLoan.interest_income_account_id,
            debit_amount: 0,
            credit_amount: paymentData.interest_portion
          }
        ]);

        await base44.entities.LoanPayment.update(payment.id, {
          interest_transaction_id: interestTx.id
        });
      }

      // Create transaction for fees if any
      if (paymentData.fee_portion > 0) {
        const feeTx = await base44.entities.Transaction.create({
          business_id: currentBusiness.id,
          transaction_date: paymentData.payment_date,
          description: `Loan payment - Late Fee (${selectedLoan.borrower_name})`,
          amount: paymentData.fee_portion,
          source: 'manual',
          reference_number: paymentData.reference_number
        });

        await base44.entities.TransactionLine.bulkCreate([
          {
            transaction_id: feeTx.id,
            business_id: currentBusiness.id,
            account_id: paymentData.bank_account_id,
            debit_amount: paymentData.fee_portion,
            credit_amount: 0
          },
          {
            transaction_id: feeTx.id,
            business_id: currentBusiness.id,
            account_id: selectedLoan.interest_income_account_id,
            debit_amount: 0,
            credit_amount: paymentData.fee_portion
          }
        ]);

        await base44.entities.LoanPayment.update(payment.id, {
          fee_transaction_id: feeTx.id
        });
      }

      // Update loan
      const newBalance = selectedLoan.current_balance - paymentData.principal_portion;
      const newStatus = newBalance <= 0 ? 'paid_off' : 'active';
      
      await base44.entities.Loan.update(selectedLoan.id, {
        current_balance: Math.max(0, newBalance),
        total_interest_earned: selectedLoan.total_interest_earned + paymentData.interest_portion,
        total_fees_earned: selectedLoan.total_fees_earned + paymentData.fee_portion,
        status: newStatus,
        payoff_date: newStatus === 'paid_off' ? paymentData.payment_date : null
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentBusiness.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentBusiness.id] });
      setIsPaymentFormOpen(false);
      setSelectedLoan(null);
    }
  });

  // Filter loans
  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         loan.borrower_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    totalOutstanding: loans.reduce((sum, l) => sum + (l.status !== 'paid_off' ? l.current_balance : 0), 0),
    totalInterestEarned: loans.reduce((sum, l) => sum + l.total_interest_earned, 0),
    activeLoans: loans.filter(l => l.status === 'active').length,
    lateLoans: loans.filter(l => l.status === 'late').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <HandCoins className="w-8 h-8 text-indigo-600" />
              Loan Tracking
            </h1>
            <p className="text-gray-500 mt-1">
              Track loans, record payments, and manage amortization schedules
            </p>
          </div>

          {canEdit() && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setIsWizardOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Loan
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.totalOutstanding)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Interest Earned</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.totalInterestEarned)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Loans</p>
                  <p className="text-lg font-bold text-gray-900">{stats.activeLoans}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Late Loans</p>
                  <p className="text-lg font-bold text-gray-900">{stats.lateLoans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by borrower name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="late">Late</TabsTrigger>
                  <TabsTrigger value="paid_off">Paid Off</TabsTrigger>
                  <TabsTrigger value="defaulted">Defaulted</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Loans Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <HandCoins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery 
                  ? 'No loans match your search' 
                  : 'No loans yet. Create your first loan to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLoans.map(loan => (
              <LoanCard
                key={loan.id}
                loan={loan}
                canEdit={canEdit()}
                onRecordPayment={(loan) => {
                  setSelectedLoan(loan);
                  setIsPaymentFormOpen(true);
                }}
                onViewSchedule={(loan) => {
                  setSelectedLoan(loan);
                  setIsScheduleOpen(true);
                }}
                onViewDetails={(loan) => {
                  // TODO: Implement loan details view
                }}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <LoanWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSubmit={(data) => createLoanMutation.mutate(data)}
          isSubmitting={createLoanMutation.isPending}
        />

        <PaymentForm
          loan={selectedLoan}
          isOpen={isPaymentFormOpen}
          onClose={() => {
            setIsPaymentFormOpen(false);
            setSelectedLoan(null);
          }}
          onSubmit={(data) => recordPaymentMutation.mutate(data)}
          isSubmitting={recordPaymentMutation.isPending}
        />

        <AmortizationSchedule
          loan={selectedLoan}
          isOpen={isScheduleOpen}
          onClose={() => {
            setIsScheduleOpen(false);
            setSelectedLoan(null);
          }}
        />
      </div>
    </div>
  );
}

export default function Loans() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <LoansContent />
    </RequireBusinessAccess>
  );
}
