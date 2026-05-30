import React, { useState } from 'react';
// base44 removed
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceCard from '@/components/invoices/InvoiceCard';
import PaymentRecordForm from '@/components/invoices/PaymentRecordForm';

function InvoicesContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', currentBusiness?.id],
    queryFn: () => base44.entities.Invoice.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentBusiness?.id],
    queryFn: () => base44.entities.Client.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  // Create/update invoice mutation
  const saveInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      if (selectedInvoice) {
        return await base44.entities.Invoice.update(selectedInvoice.id, {
          ...invoiceData,
          business_id: currentBusiness.id
        });
      } else {
        return await base44.entities.Invoice.create({
          ...invoiceData,
          business_id: currentBusiness.id,
          amount_paid: 0,
          balance_due: invoiceData.total_amount
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentBusiness.id] });
      setIsInvoiceFormOpen(false);
      setSelectedInvoice(null);
    }
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Create payment record
      const payment = await base44.entities.InvoicePayment.create({
        ...paymentData,
        business_id: currentBusiness.id,
        invoice_id: selectedInvoice.id
      });

      // Create accounting transaction
      const transaction = await base44.entities.Transaction.create({
        business_id: currentBusiness.id,
        transaction_date: paymentData.payment_date,
        description: `Payment for invoice ${selectedInvoice.invoice_number}`,
        amount: paymentData.amount,
        source: 'manual',
        reference_number: paymentData.reference_number
      });

      // Create transaction lines (Debit: Bank, Credit: Income)
      await base44.entities.TransactionLine.bulkCreate([
        {
          transaction_id: transaction.id,
          business_id: currentBusiness.id,
          account_id: paymentData.bank_account_id,
          debit_amount: paymentData.amount,
          credit_amount: 0
        },
        {
          transaction_id: transaction.id,
          business_id: currentBusiness.id,
          account_id: selectedInvoice.income_account_id,
          debit_amount: 0,
          credit_amount: paymentData.amount
        }
      ]);

      // Update payment with transaction ID
      await base44.entities.InvoicePayment.update(payment.id, {
        transaction_id: transaction.id
      });

      // Update invoice
      const newAmountPaid = selectedInvoice.amount_paid + paymentData.amount;
      const newBalanceDue = selectedInvoice.total_amount - newAmountPaid;
      const isFullyPaid = newBalanceDue <= 0;

      await base44.entities.Invoice.update(selectedInvoice.id, {
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: isFullyPaid ? 'paid' : selectedInvoice.status,
        paid_date: isFullyPaid ? paymentData.payment_date : null,
        transaction_id: isFullyPaid ? transaction.id : selectedInvoice.transaction_id
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentBusiness.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentBusiness.id] });
      setIsPaymentFormOpen(false);
      setSelectedInvoice(null);
    }
  });

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const client = clients.find(c => c.id === invoice.client_id);
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client?.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    totalOutstanding: invoices.reduce((sum, inv) => sum + (inv.status !== 'paid' ? inv.balance_due : 0), 0),
    draftCount: invoices.filter(inv => inv.status === 'draft').length,
    overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
    paidThisMonth: invoices.filter(inv => 
      inv.status === 'paid' && 
      inv.paid_date && 
      new Date(inv.paid_date).getMonth() === new Date().getMonth()
    ).reduce((sum, inv) => sum + inv.total_amount, 0)
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceFormOpen(true);
  };

  const handleMarkPaid = (invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentFormOpen(true);
  };

  const handleViewPDF = (invoice) => {
    // TODO: Implement PDF generation/export
    console.log('View PDF for invoice:', invoice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              Invoices
            </h1>
            <p className="text-gray-500 mt-1">
              Create invoices and track payments
            </p>
          </div>

          {canEdit() && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                setSelectedInvoice(null);
                setIsInvoiceFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
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
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Drafts</p>
                  <p className="text-lg font-bold text-gray-900">{stats.draftCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Overdue</p>
                  <p className="text-lg font-bold text-gray-900">{stats.overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid This Month</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.paidThisMonth)}
                  </p>
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
                  placeholder="Search by invoice number or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Grid */}
        {isLoadingInvoices ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery 
                  ? 'No invoices match your search' 
                  : 'No invoices yet. Create your first invoice to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map(invoice => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                client={clients.find(c => c.id === invoice.client_id)}
                canEdit={canEdit()}
                onEdit={handleEdit}
                onMarkPaid={handleMarkPaid}
                onViewPDF={handleViewPDF}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <InvoiceForm
          invoice={selectedInvoice}
          isOpen={isInvoiceFormOpen}
          onClose={() => {
            setIsInvoiceFormOpen(false);
            setSelectedInvoice(null);
          }}
          onSubmit={(data) => saveInvoiceMutation.mutate(data)}
          isSubmitting={saveInvoiceMutation.isPending}
        />

        <PaymentRecordForm
          invoice={selectedInvoice}
          isOpen={isPaymentFormOpen}
          onClose={() => {
            setIsPaymentFormOpen(false);
            setSelectedInvoice(null);
          }}
          onSubmit={(data) => recordPaymentMutation.mutate(data)}
          isSubmitting={recordPaymentMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function Invoices() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <InvoicesContent />
    </RequireBusinessAccess>
  );
}
