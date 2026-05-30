// src/pages/Contractors.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { contractorsAPI, contractorPaymentsAPI, transactionsAPI, accountsAPI, bankAccountsAPI } from '../api/index';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Plus, Search, UserPlus, DollarSign, Mail, Phone,
  Edit, Trash2, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';

// ---------- Contractor Form ----------
function ContractorFormDialog({ open, onClose, onSubmit, contractor, isPending }) {
  const [form, setForm] = useState(contractor ?? {
    full_legal_name: '', business_name: '', email: '', phone: '',
    address_line1: '', city: '', state: '', zip_code: '',
    tax_id: '', tax_id_type: 'ssn', w9_collected: false, payment_method: 'check', notes: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contractor ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full Legal Name *</Label>
              <Input value={form.full_legal_name} onChange={e => set('full_legal_name', e.target.value)} className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Business Name</Label>
              <Input value={form.business_name} onChange={e => set('business_name', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Street Address *</Label>
              <Input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>State *</Label>
              <Input value={form.state} onChange={e => set('state', e.target.value)} className="mt-1.5" maxLength={2} />
            </div>
            <div>
              <Label>ZIP *</Label>
              <Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Tax ID Type *</Label>
              <Select value={form.tax_id_type} onValueChange={v => set('tax_id_type', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssn">SSN</SelectItem>
                  <SelectItem value="ein">EIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax ID *</Label>
              <Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} className="mt-1.5" placeholder="XXX-XX-XXXX" />
            </div>
            <div>
              <Label>W-9 Collected?</Label>
              <Select value={form.w9_collected ? 'yes' : 'no'} onValueChange={v => set('w9_collected', v === 'yes')}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="wire">Wire</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.full_legal_name || !form.address_line1 || !form.city || !form.state || !form.zip_code || !form.tax_id || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : contractor ? 'Save Changes' : 'Add Contractor'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Payment Form ----------
function PaymentFormDialog({ open, onClose, onSubmit, contractor, accounts, bankAccounts, isPending }) {
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: contractor?.payment_method ?? 'check',
    check_number: '',
    bank_account_id: '',
    expense_account_id: '',
    memo: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const expenseAccounts = accounts.filter(a => a.type === 'expense' && a.is_active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pay {contractor?.full_legal_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Date *</Label>
              <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="wire">Wire</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.payment_method === 'check' && (
              <div>
                <Label>Check Number</Label>
                <Input value={form.check_number} onChange={e => set('check_number', e.target.value)} className="mt-1.5" />
              </div>
            )}
            <div className="col-span-2">
              <Label>Pay From (Bank Account) *</Label>
              <Select value={form.bank_account_id} onValueChange={v => set('bank_account_id', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter(a => a.is_active).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Expense Account *</Label>
              <Select value={form.expense_account_id} onValueChange={v => set('expense_account_id', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select expense account" /></SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Memo</Label>
              <Input value={form.memo} onChange={e => set('memo', e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.amount || !form.bank_account_id || !form.expense_account_id || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- 1099 Dashboard ----------
function Dashboard1099({ contractors, payments, year }) {
  const threshold = 600;
  const ytdByContractor = {};
  for (const p of payments) {
    if (new Date(p.payment_date).getFullYear() === year) {
      ytdByContractor[p.contractor_id] = (ytdByContractor[p.contractor_id] ?? 0) + p.amount;
    }
  }
  const needs1099 = contractors.filter(c => (ytdByContractor[c.id] ?? 0) >= threshold);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{year} 1099-NEC Preparation</h2>
        <Badge variant="outline">{needs1099.length} require 1099</Badge>
      </div>
      {needs1099.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-500">No contractors have reached the $600 threshold for {year}.</CardContent></Card>
      ) : needs1099.map(c => (
        <Card key={c.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{c.full_legal_name}</p>
              <p className="text-sm text-gray-500">{c.tax_id_type?.toUpperCase()}: {c.tax_id}</p>
              <p className="text-sm text-gray-500">{c.address_line1}, {c.city}, {c.state} {c.zip_code}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">
                ${(ytdByContractor[c.id] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              {c.w9_collected
                ? <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />W-9 on file</Badge>
                : <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Missing W-9</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Main Page ----------
function ContractorsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showContractorForm, setShowContractorForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [payingContractor, setPayingContractor] = useState(null);
  const [deletingContractor, setDeletingContractor] = useState(null);
  const currentYear = new Date().getFullYear();

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors', currentBusiness?.id],
    queryFn: () => contractorsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['contractor-payments', currentBusiness?.id],
    queryFn: () => contractorPaymentsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => bankAccountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const createMutation = useMutation({
    mutationFn: (data) => contractorsAPI.create({ ...data, business_id: currentBusiness.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); setShowContractorForm(false); setEditingContractor(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => contractorsAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); setShowContractorForm(false); setEditingContractor(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contractorsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); setDeletingContractor(null); },
  });

  const paymentMutation = useMutation({
    mutationFn: async (form) => {
      // Create accounting transaction
      const tx = await transactionsAPI.create({
        business_id: currentBusiness.id,
        transaction_date: form.payment_date,
        description: `Payment to ${payingContractor.full_legal_name}${form.memo ? ': ' + form.memo : ''}`,
        amount: parseFloat(form.amount),
        source: 'manual',
        reference_number: form.check_number ?? '',
      }, [
        { account_id: form.expense_account_id, debit: parseFloat(form.amount), credit: 0, business_id: currentBusiness.id },
        { account_id: form.bank_account_id,    debit: 0, credit: parseFloat(form.amount), business_id: currentBusiness.id },
      ]);

      // Create payment record
      return contractorPaymentsAPI.create({
        business_id: currentBusiness.id,
        contractor_id: payingContractor.id,
        payment_date: form.payment_date,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        check_number: form.check_number,
        bank_account_id: form.bank_account_id,
        expense_account_id: form.expense_account_id,
        transaction_id: tx.id,
        memo: form.memo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowPaymentForm(false);
      setPayingContractor(null);
    },
  });

  const getYTD = (contractorId) =>
    payments
      .filter(p => p.contractor_id === contractorId && new Date(p.payment_date).getFullYear() === currentYear)
      .reduce((s, p) => s + p.amount, 0);

  const filtered = contractors.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.full_legal_name.toLowerCase().includes(q) ||
           c.business_name?.toLowerCase().includes(q) ||
           c.email?.toLowerCase().includes(q);
  }).filter(c => c.is_active);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contractors & 1099s</h1>
          <p className="text-gray-600 mt-1">Manage contractor payments and prepare 1099-NEC forms</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { setEditingContractor(null); setShowContractorForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="w-4 h-4 mr-2" />Add Contractor
          </Button>
        )}
      </div>

      <Tabs defaultValue="contractors">
        <TabsList>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="1099">1099 Preparation</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input placeholder="Search contractors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No contractors yet</h3>
              <p className="text-gray-500 text-sm mb-4">Add contractors to track payments and prepare 1099s</p>
              {canEdit() && <Button onClick={() => setShowContractorForm(true)}>Add Your First Contractor</Button>}
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => {
                const ytd = getYTD(c.id);
                const needs1099 = ytd >= 600;
                return (
                  <Card key={c.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{c.full_legal_name}</h3>
                            {needs1099 && <Badge className={c.w9_collected ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}>1099 Required</Badge>}
                            {c.w9_collected
                              ? <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />W-9</Badge>
                              : needs1099 && <Badge variant="outline" className="text-red-600"><AlertCircle className="w-3 h-3 mr-1" />No W-9</Badge>}
                          </div>
                          {c.business_name && <p className="text-sm text-gray-500">{c.business_name}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                            {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                          </div>
                          <p className="mt-2 text-sm">
                            <span className="text-gray-500">YTD payments: </span>
                            <span className="font-bold text-indigo-600">${ytd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </p>
                        </div>
                        {canEdit() && (
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" onClick={() => { setPayingContractor(c); setShowPaymentForm(true); }}>
                              <DollarSign className="w-4 h-4 mr-1" />Pay
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingContractor(c); setShowContractorForm(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingContractor(c)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="1099" className="mt-4">
          <Dashboard1099 contractors={contractors} payments={payments} year={currentYear} />
        </TabsContent>
      </Tabs>

      {showContractorForm && (
        <ContractorFormDialog
          open={showContractorForm}
          onClose={() => { setShowContractorForm(false); setEditingContractor(null); }}
          onSubmit={data => editingContractor ? updateMutation.mutate({ id: editingContractor.id, data }) : createMutation.mutate(data)}
          contractor={editingContractor}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {showPaymentForm && payingContractor && (
        <PaymentFormDialog
          open={showPaymentForm}
          onClose={() => { setShowPaymentForm(false); setPayingContractor(null); }}
          onSubmit={data => paymentMutation.mutate(data)}
          contractor={payingContractor}
          accounts={accounts}
          bankAccounts={bankAccounts}
          isPending={paymentMutation.isPending}
        />
      )}

      <AlertDialog open={!!deletingContractor} onOpenChange={() => setDeletingContractor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {deletingContractor?.full_legal_name}. Payment history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingContractor.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Contractors() {
  return (
    <RequireBusinessAccess>
      <ContractorsContent />
    </RequireBusinessAccess>
  );
}
