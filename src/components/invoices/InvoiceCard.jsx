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
  MoreVertical,
  FileText,
  DollarSign,
  Send,
  CheckCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format, isPast } from 'date-fns';

export default function InvoiceCard({ invoice, client, onEdit, onMarkPaid, onViewPDF, canEdit }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-orange-100 text-orange-800'
  };

  const statusIcons = {
    draft: <FileText className="w-4 h-4" />,
    sent: <Send className="w-4 h-4" />,
    paid: <CheckCircle className="w-4 h-4" />,
    overdue: <AlertCircle className="w-4 h-4" />,
    cancelled: <AlertCircle className="w-4 h-4" />
  };

  const isOverdue = invoice.status !== 'paid' && isPast(new Date(invoice.due_date));

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {invoice.invoice_number}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {client?.client_name || 'Unknown Client'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusColors[isOverdue ? 'overdue' : invoice.status]}>
              <span className="flex items-center gap-1">
                {statusIcons[isOverdue ? 'overdue' : invoice.status]}
                {isOverdue ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
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
                  <DropdownMenuItem onClick={() => onEdit(invoice)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Edit Invoice
                  </DropdownMenuItem>
                  {invoice.status !== 'paid' && (
                    <DropdownMenuItem onClick={() => onMarkPaid(invoice)}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Record Payment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onViewPDF(invoice)}>
                    <FileText className="w-4 h-4 mr-2" />
                    View/Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(invoice.total_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Balance Due</p>
            <p className="text-lg font-semibold text-indigo-600">
              {formatCurrency(invoice.balance_due)}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t text-sm">
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Invoice Date</span>
            </div>
            <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Due Date</span>
            </div>
            <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              {format(new Date(invoice.due_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {canEdit && invoice.status !== 'paid' && (
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onMarkPaid(invoice)}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
