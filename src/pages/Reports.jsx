import React, { useState, useEffect } from 'react';
// base44 removed
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, subQuarters, subYears } from 'date-fns';
import ReportControls from '@/components/reports/ReportControls';
import ProfitLossReport from '@/components/reports/ProfitLossReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import CashFlowReport from '@/components/reports/CashFlowReport';
import { calculateProfitLoss, calculateBalanceSheet, calculateCashFlow } from '@/components/reports/reportCalculations';

function ReportsContent() {
  const { currentBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfMonth(new Date()).toISOString().split('T')[0]);

  // Fetch data
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness?.id
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => base44.entities.Transaction.filter({
      business_id: currentBusiness.id,
      is_deleted: false
    }),
    enabled: !!currentBusiness?.id
  });

  const { data: transactionLines = [], isLoading: isLoadingLines } = useQuery({
    queryKey: ['transaction-lines', currentBusiness?.id],
    queryFn: () => base44.entities.TransactionLine.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  const isLoading = isLoadingAccounts || isLoadingTransactions || isLoadingLines;

  // Calculate reports
  const [reportData, setReportData] = useState({
    profitLoss: null,
    balanceSheet: null,
    cashFlow: null
  });

  useEffect(() => {
    if (!isLoading && accounts.length > 0) {
      // Calculate Profit & Loss
      const plData = calculateProfitLoss(accounts, transactionLines, transactions, startDate, endDate);
      
      // Calculate Balance Sheet (as of end date)
      const bsData = calculateBalanceSheet(accounts, transactionLines, transactions, endDate);
      
      // Calculate Cash Flow
      const cfData = calculateCashFlow(accounts, transactionLines, transactions, startDate, endDate);
      
      setReportData({
        profitLoss: plData,
        balanceSheet: bsData,
        cashFlow: cfData
      });
    }
  }, [accounts, transactionLines, transactions, startDate, endDate, isLoading]);

  const handlePresetSelect = (preset) => {
    const now = new Date();
    
    switch (preset) {
      case 'this-month':
        setStartDate(startOfMonth(now).toISOString().split('T')[0]);
        setEndDate(endOfMonth(now).toISOString().split('T')[0]);
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth).toISOString().split('T')[0]);
        setEndDate(endOfMonth(lastMonth).toISOString().split('T')[0]);
        break;
      case 'this-quarter':
        setStartDate(startOfQuarter(now).toISOString().split('T')[0]);
        setEndDate(endOfQuarter(now).toISOString().split('T')[0]);
        break;
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        setStartDate(startOfQuarter(lastQuarter).toISOString().split('T')[0]);
        setEndDate(endOfQuarter(lastQuarter).toISOString().split('T')[0]);
        break;
      case 'this-year':
        setStartDate(startOfYear(now).toISOString().split('T')[0]);
        setEndDate(endOfYear(now).toISOString().split('T')[0]);
        break;
      case 'last-year':
        const lastYear = subYears(now, 1);
        setStartDate(startOfYear(lastYear).toISOString().split('T')[0]);
        setEndDate(endOfYear(lastYear).toISOString().split('T')[0]);
        break;
      case 'ytd':
        setStartDate(startOfYear(now).toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  const handleExport = () => {
    // TODO: Implement PDF/CSV export
    console.log('Export report:', activeTab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Financial Reports
          </h1>
          <p className="text-gray-500 mt-1">
            Understand your business performance
          </p>
        </div>

        {/* Report Controls */}
        <div className="mb-6">
          <ReportControls
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPresetSelect={handlePresetSelect}
            onExport={handleExport}
          />
        </div>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profit-loss" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Cash Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profit-loss">
            <ProfitLossReport data={reportData.profitLoss} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="balance-sheet">
            <BalanceSheetReport data={reportData.balanceSheet} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="cash-flow">
            <CashFlowReport data={reportData.cashFlow} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <ReportsContent />
    </RequireBusinessAccess>
  );
}
