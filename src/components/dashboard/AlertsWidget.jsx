import React from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, FileText, HandCoins, Users } from 'lucide-react';
import { isBefore, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function AlertsWidget() {
  const { currentBusiness } = useBusiness();

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', currentBusiness?.id],
    queryFn: () => base44.entities.Invoice.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', currentBusiness?.id],
    queryFn: () => base44.entities.Loan.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors', currentBusiness?.id],
    queryFn: () => base44.entities.Contractor.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness
  });

  const { data: contractorPayments = [] } = useQuery({
    queryKey: ['contractor-payments', currentBusiness?.id],
    queryFn: () => base44.entities.ContractorPayment.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const alerts = [];

  // Overdue invoices
  const overdueInvoices = invoices.filter(inv => 
    inv.status !== 'paid' && inv.due_date && isBefore(new Date(inv.due_date), new Date())
  );
  if (overdueInvoices.length > 0) {
    alerts.push({
      id: 'overdue-invoices',
      type: 'warning',
      icon: FileText,
      message: `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}`,
      link: 'Invoices'
    });
  }

  // Late loans
  const lateLoans = loans.filter(loan => loan.status === 'late');
  if (lateLoans.length > 0) {
    alerts.push({
      id: 'late-loans',
      type: 'error',
      icon: HandCoins,
      message: `${lateLoans.length} loan${lateLoans.length !== 1 ? 's' : ''} past due`,
      link: 'Loans'
    });
  }

  // Contractors approaching $600 threshold
  const contractorsNearThreshold = contractors.filter(contractor => {
    const payments = contractorPayments.filter(p => p.contractor_id === contractor.id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return totalPaid >= 500 && totalPaid < 600 && !contractor.w9_collected;
  });
  if (contractorsNearThreshold.length > 0) {
    alerts.push({
      id: 'w9-needed',
      type: 'warning',
      icon: Users,
      message: `${contractorsNearThreshold.length} contractor${contractorsNearThreshold.length !== 1 ? 's' : ''} need W-9 forms`,
      link: 'Contractors'
    });
  }

  // Invoices due soon (within 3 days)
  const dueSoonInvoices = invoices.filter(inv => {
    if (inv.status === 'paid' || !inv.due_date) return false;
    const dueDate = new Date(inv.due_date);
    const threeDaysFromNow = addDays(new Date(), 3);
    return dueDate <= threeDaysFromNow && dueDate >= new Date();
  });
  if (dueSoonInvoices.length > 0) {
    alerts.push({
      id: 'due-soon',
      type: 'info',
      icon: FileText,
      message: `${dueSoonInvoices.length} invoice${dueSoonInvoices.length !== 1 ? 's' : ''} due within 3 days`,
      link: 'Invoices'
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Alerts & Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Link key={alert.id} to={createPageUrl(alert.link)}>
                <div className={`p-3 rounded-lg border flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  alert.type === 'error' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    alert.type === 'error' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-amber-600' :
                    'text-blue-600'
                  }`} />
                  <p className="text-sm font-medium text-gray-900 flex-1">
                    {alert.message}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    View
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
