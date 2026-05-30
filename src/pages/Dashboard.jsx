// src/pages/Dashboard.jsx
import React from 'react';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import UpcomingRecurringWidget from '../components/recurring/UpcomingRecurringWidget';
import CashPositionWidget from '../components/bank-accounts/CashPositionWidget';
import ProfitThisMonthWidget from '../components/dashboard/ProfitThisMonthWidget';
import AccountsReceivableWidget from '../components/dashboard/AccountsReceivableWidget';
import LoanPortfolioWidget from '../components/dashboard/LoanPortfolioWidget';
import RecentActivityWidget from '../components/dashboard/RecentActivityWidget';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';
import FinancialHealthWidget from '../components/dashboard/FinancialHealthWidget';
import AlertsWidget from '../components/dashboard/AlertsWidget';
import BudgetStatusWidget from '../components/budgets/BudgetStatusWidget';
import { Badge } from '../components/ui/badge';
import { Building2 } from 'lucide-react';

function DashboardContent() {
  const { currentBusiness, userAccess } = useBusiness();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {currentBusiness?.display_name}
                </h1>
                <p className="text-gray-500">{currentBusiness?.legal_name}</p>
              </div>
            </div>
            {userAccess && (
              <Badge className={`px-3 py-1 ${
                userAccess.permission_level === 'admin'   ? 'bg-violet-100 text-violet-700' :
                userAccess.permission_level === 'editor'  ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
              }`}>
                {userAccess.permission_level === 'admin'  ? 'Administrator' :
                 userAccess.permission_level === 'editor' ? 'Editor' : 'View Only'}
              </Badge>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="mb-6">
          <AlertsWidget />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-2">
            <CashPositionWidget />
          </div>
          <ProfitThisMonthWidget />
          <FinancialHealthWidget />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <AccountsReceivableWidget />
          <LoanPortfolioWidget />
          <BudgetStatusWidget />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActionsWidget />
        </div>

        {/* Activity + Recurring */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingRecurringWidget />
          <RecentActivityWidget />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <RequireBusinessAccess>
      <DashboardContent />
    </RequireBusinessAccess>
  );
}
