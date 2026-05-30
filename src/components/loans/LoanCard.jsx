import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  MoreVertical,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency, formatPercent, isPaymentLate } from './loanCalculations';
import { format } from 'date-fns';

export default function LoanCard({ loan, onRecordPayment, onViewSchedule, onViewDetails, canEdit }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    late: 'bg-red-100 text-red-800',
    paid_off: 'bg-gray-100 text-gray-800',
    defaulted: 'bg-orange-100 text-orange-800'
  };

  const statusIcons = {
    active: <CheckCircle className="w-4 h-4" />,
    late: <AlertCircle className="w-4 h-4" />,
    paid_off: <CheckCircle className="w-4 h-4" />,
    defaulted: <AlertCircle className="w-4 h-4" />
  };

  const isLate = loan.status === 'active' && loan.next_payment_date && 
                 isPaymentLate(loan.next_payment_date, loan.grace_period_days);

  const progressPercent = ((loan.principal_amount - loan.current_balance) / loan.principal_amount) * 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{loan.borrower_name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {loan.borrower_email}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusColors[loan.status]}>
              <span className="flex items-center gap-1">
                {statusIcons[loan.status]}
                {loan.status === 'paid_off' ? 'Paid Off' : 
                 loan.status === 'active' && isLate ? 'Late' :
                 loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
              </span>
            </Badge>
            
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRecordPayment(loan)}>
                    <Receipt className="w-4 h-4 mr-2" />
                    Record Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewSchedule(loan)}>
                    <FileText className="w-4 h-4 mr-2" />
                    View Schedule
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewDetails(loan)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Loan Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Loan Amount Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Original Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(loan.principal_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Balance</p>
            <p className="text-lg font-semibold text-indigo-600">
              {formatCurrency(loan.current_balance)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Paid</span>
            <span>{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Loan Details */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Rate</span>
            </div>
            <p className="text-sm font-medium">{formatPercent(loan.interest_rate)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-xs">Payment</span>
            </div>
            <p className="text-sm font-medium">{formatCurrency(loan.payment_amount)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Next Due</span>
            </div>
            <p className="text-sm font-medium">
              {loan.next_payment_date ? format(new Date(loan.next_payment_date), 'MMM d') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {canEdit && loan.status === 'active' && (
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onRecordPayment(loan)}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
