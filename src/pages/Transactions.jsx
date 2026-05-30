import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import { transactionsAPI, accountsAPI, tagsAPI, bankAccountsAPI } from '../api/index';
import { supabase } from '../lib/supabase';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Loader2, Receipt, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionRow from '@/components/transactions/TransactionRow';
import CSVImportWizard from '@/components/import/CSVImportWizard';

function getTransactionAmount(transaction) {
  const lines = transaction.transaction_lines || [];
  return lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
}

function TransactionsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => transactionsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness?.id
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness?.id
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => bankAccountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness?.id
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', currentBusiness?.id],
    queryFn: () => tagsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness?.id
  });

  const { data: transactionTags = [] } = useQuery({
    queryKey: ['transactionTags', currentBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_tags')
        .select('*')
        .eq('business_id', currentBusiness.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBusiness?.id
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (formData) => {
      const { tags: tagIds, from_account_id, to_account_id, ...txnData } = formData;

      const fromAccount = accounts.find(a => a.id === from_account_id);
      const toAccount   = accounts.find(a => a.id === to_account_id);

      if (!fromAccount || !toAccount) throw new Error('Invalid account selection');

      const creditIncreaseTypes = ['liability', 'equity', 'income'];
      let debitAccountId, creditAccountId;

      if (creditIncreaseTypes.includes(fromAccount.type)) {
        debitAccountId  = from_account_id;
        creditAccountId = to_account_id;
      } else {
        creditAccountId = from_account_id;
        debitAccountId  = to_account_id;
      }

      const amount = parseFloat(txnData.amount);

      const transaction = await transactionsAPI.create(
        {
          business_id:      currentBusiness.id,
          transaction_date: txnData.transaction_date,
          description:      txnData.description,
          source:           'manual',
          is_cleared:       txnData.is_cleared || false,
          reference_number: txnData.reference_number || null,
          memo:             txnData.notes || null,
        },
        [
          { account_id: debitAccountId,  debit: amount, credit: 0,      description: txnData.description },
          { account_id: creditAccountId, debit: 0,      credit: amount, description: txnData.description },
        ]
      );

      if (tagIds && tagIds.length > 0) {
        await supabase.from('transaction_tags').insert(
          tagIds.map(tagId => ({
            transaction_id: transaction.id,
            tag_id:         tagId,
            business_id:    currentBusiness.id,
          }))
        );
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions',     currentBusiness.id] });
      queryClient.invalidateQueries({ queryKey: ['transactionTags',  currentBusiness.id] });
      setIsFormOpen(false);
      setEditingTransaction(null);
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (transaction) => transactionsAPI.delete(transaction.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentBusiness.id] });
      setDeleteConfirm(null);
    }
  });

  const handleSubmit = (formData) => createTransactionMutation.mutate(formData);

  const handleEdit = (transaction) => {
    const lines      = transaction.transaction_lines || [];
    const debitLine  = lines.find(l => parseFloat(l.debit)  > 0);
    const creditLine = lines.find(l => parseFloat(l.credit) > 0);
    const txnTags    = transactionTags.filter(tt => tt.transaction_id === transaction.id);

    setEditingTransaction({
      ...transaction,
      amount:          getTransactionAmount(transaction),
      from_account_id: creditLine?.account_id || '',
      to_account_id:   debitLine?.account_id  || '',
      tags:            txnTags.map(tt => tt.tag_id),
    });
    setIsFormOpen(true);
  };

  const enhancedTransactions = transactions.map(txn => {
    const txnTagIds  = transactionTags.filter(tt => tt.transaction_id === txn.id).map(tt => tt.tag_id);
    const tagObjects = txnTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
    const lines      = txn.transaction_lines || [];
    const debitLine  = lines.find(l => parseFloat(l.debit)  > 0);
    const creditLine = lines.find(l => parseFloat(l.credit) > 0);

    return {
      ...txn,
      amount:          getTransactionAmount(txn),
      from_account_id: creditLine?.account_id || '',
      to_account_id:   debitLine?.account_id  || '',
      tagObjects,
    };
  });

  const filteredTransactions = enhancedTransactions.filter(txn => {
    const matchesSearch =
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'cleared'   && txn.is_cleared) ||
      (statusFilter === 'uncleared' && !txn.is_cleared);
    const matchesTag =
      selectedTagFilter === 'all' ||
      txn.tagObjects.some(tag => tag.id === selectedTagFilter);
    return matchesSearch && matchesStatus && matchesTag;
  });

  const totalAmount  = filteredTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
  const clearedCount = filteredTransactions.filter(t => t.is_cleared).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-indigo-600" />
              Transactions
            </h1>
            <p className="text-gray-500 mt-1">Record and track money moving in your business</p>
          </div>

          {canEdit() && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                Import CSV
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{filteredTransactions.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Cleared</p>
              <p className="text-3xl font-bold text-green-600">{clearedCount}</p>
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
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <SelectValue placeholder="Filter by tag" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.category ? `${tag.category}: ` : ''}{tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="cleared">Cleared</TabsTrigger>
                  <TabsTrigger value="uncleared">Uncleared</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All transactions in chronological order</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? 'No transactions match your search'
                    : 'No transactions yet. Record your first transaction or import a CSV.'}
                </p>
                {canEdit() && !searchQuery && (
                  <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    Import CSV
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {filteredTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    accounts={accounts}
                    tags={tags}
                    onEdit={handleEdit}
                    onDelete={setDeleteConfirm}
                    canEdit={canEdit()}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Form */}
        <TransactionForm
          transaction={editingTransaction}
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
          onSubmit={handleSubmit}
          isSubmitting={createTransactionMutation.isPending}
          accounts={accounts}
        />

        {/* CSV Import Wizard */}
        <CSVImportWizard
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          accounts={accounts}
          bankAccounts={bankAccounts}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This transaction will be soft-deleted and preserved for audit purposes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteTransactionMutation.mutate(deleteConfirm)}
              >
                {deleteTransactionMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function Transactions() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <TransactionsContent />
    </RequireBusinessAccess>
  );
}