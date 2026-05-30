// src/api/index.js
import { supabase } from '../lib/supabase';

// =====================================================
// ACCOUNTS API
// =====================================================
export const accountsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('business_id', businessId)
      .order('account_number');
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (accountData) => {
    // Only send columns that exist in DB
    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        business_id: accountData.business_id,
        account_number: accountData.account_number,
        name: accountData.name,
        type: accountData.type,
        subtype: accountData.subtype || null,
        description: accountData.description || null,
        parent_account_id: accountData.parent_account_id || null,
        is_active: accountData.is_active ?? true,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// TRANSACTIONS API
// =====================================================
// IMPORTANT: The transactions table has NO amount column.
// Amount is derived from transaction_lines debit/credit values.
// transaction_lines columns: id, transaction_id, account_id, debit, credit, description
// (no business_id on transaction_lines)
export const transactionsAPI = {
  getAll: async (businessId, options = {}) => {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_lines (
          id,
          account_id,
          debit,
          credit,
          description,
          account:accounts(*)
        )
      `)
      .eq('business_id', businessId)
      .eq('is_deleted', false);

    if (options.startDate) query = query.gte('transaction_date', options.startDate);
    if (options.endDate)   query = query.lte('transaction_date', options.endDate);
    if (options.source)    query = query.eq('source', options.source);
    if (options.isCleared !== undefined) query = query.eq('is_cleared', options.isCleared);

    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_lines (
          id,
          account_id,
          debit,
          credit,
          description,
          account:accounts(*)
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // lines: array of { account_id, debit, credit, description? }
  // No business_id or line_description on transaction_lines
  create: async (transactionData, lines) => {
    // transactions columns: business_id, transaction_date, description,
    // reference_number, memo, source, is_cleared, is_deleted, created_by
    // NO amount column
    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .insert([{
        business_id: transactionData.business_id,
        transaction_date: transactionData.transaction_date,
        description: transactionData.description,
        reference_number: transactionData.reference_number || null,
        memo: transactionData.memo || transactionData.notes || null,
        source: transactionData.source || 'manual',
        is_cleared: transactionData.is_cleared ?? false,
        is_deleted: false,
      }])
      .select()
      .single();
    if (transError) throw transError;

    // transaction_lines: only transaction_id, account_id, debit, credit, description
    const linesWithId = lines.map(line => ({
      transaction_id: transaction.id,
      account_id: line.account_id,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
      description: line.description || null,
    }));

    const { data: transactionLines, error: linesError } = await supabase
      .from('transaction_lines')
      .insert(linesWithId)
      .select();
    if (linesError) throw linesError;

    return { ...transaction, transaction_lines: transactionLines };
  },

  update: async (id, updates, lines = null) => {
    // Strip any fields not in DB
    const safeUpdates = {};
    const allowed = ['transaction_date', 'description', 'reference_number', 'memo', 'source', 'is_cleared', 'is_deleted'];
    allowed.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });

    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();
    if (transError) throw transError;

    if (lines) {
      const { error: deleteError } = await supabase
        .from('transaction_lines')
        .delete()
        .eq('transaction_id', id);
      if (deleteError) throw deleteError;

      const linesWithId = lines.map(line => ({
        transaction_id: id,
        account_id: line.account_id,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        description: line.description || null,
      }));

      const { data: transactionLines, error: linesError } = await supabase
        .from('transaction_lines')
        .insert(linesWithId)
        .select();
      if (linesError) throw linesError;

      return { ...transaction, transaction_lines: transactionLines };
    }

    return transaction;
  },

  // Soft delete
  delete: async (id) => {
    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// BANK ACCOUNTS API
// =====================================================
export const bankAccountsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (accountData) => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([accountData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  updateBalance: async (id, newBalance) => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ current_balance: newBalance })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// =====================================================
// BUDGETS API
// =====================================================
export const budgetsAPI = {
  getAll: async (businessId, options = {}) => {
    let query = supabase
      .from('budgets')
      .select('*, account:accounts(*)')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (options.periodType) query = query.eq('period_type', options.periodType);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  create: async (budgetData) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert([budgetData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('budgets')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// CONTRACTORS API
// =====================================================
export const contractorsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('business_id', businessId)
      .order('full_legal_name');
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (contractorData) => {
    const { data, error } = await supabase
      .from('contractors')
      .insert([contractorData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('contractors')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// CONTRACTOR PAYMENTS API
// =====================================================
export const contractorPaymentsAPI = {
  getAll: async (businessId, options = {}) => {
    let query = supabase
      .from('contractor_payments')
      .select('*, contractor:contractors(*)')
      .eq('business_id', businessId)
      .eq('is_deleted', false)
      .order('payment_date', { ascending: false });

    if (options.contractorId) query = query.eq('contractor_id', options.contractorId);
    if (options.year) {
      query = query
        .gte('payment_date', `${options.year}-01-01`)
        .lte('payment_date', `${options.year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  create: async (paymentData) => {
    const { data, error } = await supabase
      .from('contractor_payments')
      .insert([paymentData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('contractor_payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('contractor_payments')
      .update({ is_deleted: true })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// OWNER EQUITY API
// =====================================================
export const ownerEquityAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('owner_equity')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('owner_name');
    if (error) throw error;
    return data;
  },

  create: async (ownerData) => {
    const { data, error } = await supabase
      .from('owner_equity')
      .insert([ownerData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('owner_equity')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getTransactions: async (businessId, ownerEquityId = null) => {
    let query = supabase
      .from('owner_transactions')
      .select('*, owner:owner_equity(*)')
      .eq('business_id', businessId)
      .order('transaction_date', { ascending: false });

    if (ownerEquityId) query = query.eq('owner_equity_id', ownerEquityId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  createTransaction: async (txData) => {
    const { data, error } = await supabase
      .from('owner_transactions')
      .insert([txData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// =====================================================
// RECEIPTS API
// =====================================================
export const receiptsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_deleted', false)
      .order('upload_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getByTransaction: async (transactionId) => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('is_deleted', false);
    if (error) throw error;
    return data;
  },

  create: async (receiptData) => {
    const { data, error } = await supabase
      .from('receipts')
      .insert([receiptData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id, userEmail) => {
    const { error } = await supabase
      .from('receipts')
      .update({
        is_deleted: true,
        deleted_date: new Date().toISOString(),
        deleted_by: userEmail,
      })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// RECURRING TRANSACTIONS API
// =====================================================
export const recurringTransactionsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        from_account:accounts!from_account_id(*),
        to_account:accounts!to_account_id(*)
      `)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('next_occurrence_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  create: async (templateData) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([templateData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// TAGS API
// =====================================================
export const tagsAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  create: async (tagData) => {
    const { data, error } = await supabase
      .from('tags')
      .insert([tagData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getForTransaction: async (transactionId) => {
    const { data, error } = await supabase
      .from('transaction_tags')
      .select('*, tag:tags(*)')
      .eq('transaction_id', transactionId);
    if (error) throw error;
    return data.map(row => row.tag);
  },

  setForTransaction: async (transactionId, tagIds, businessId) => {
    const { error: deleteError } = await supabase
      .from('transaction_tags')
      .delete()
      .eq('transaction_id', transactionId);
    if (deleteError) throw deleteError;

    if (tagIds.length === 0) return;

    const rows = tagIds.map(tagId => ({
      transaction_id: transactionId,
      tag_id: tagId,
      business_id: businessId,
    }));
    const { error: insertError } = await supabase
      .from('transaction_tags')
      .insert(rows);
    if (insertError) throw insertError;
  },
};

// =====================================================
// PERIOD LOCKS API
// =====================================================
export const periodLocksAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('period_locks')
      .select('*')
      .eq('business_id', businessId)
      .order('lock_start_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getActive: async (businessId) => {
    const { data, error } = await supabase
      .from('period_locks')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },

  isDateLocked: async (businessId, date) => {
    const { data, error } = await supabase
      .from('period_locks')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('lock_start_date', date)
      .gte('lock_end_date', date)
      .limit(1);
    if (error) throw error;
    return data.length > 0;
  },

  create: async (lockData) => {
    const { data, error } = await supabase
      .from('period_locks')
      .insert([lockData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  unlock: async (id, unlockedBy, reason) => {
    const { data, error } = await supabase
      .from('period_locks')
      .update({
        is_active: false,
        unlocked_by: unlockedBy,
        unlocked_date: new Date().toISOString(),
        unlock_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// =====================================================
// IMPORT BATCHES API
// =====================================================
export const importBatchesAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  create: async (batchData) => {
    const { data, error } = await supabase
      .from('import_batches')
      .insert([batchData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('import_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  undo: async (batchId, transactionIds) => {
    if (transactionIds.length === 0) return;
    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true })
      .in('id', transactionIds);
    if (error) throw error;
    await supabase
      .from('import_batches')
      .update({ can_undo: false })
      .eq('id', batchId);
  },
};

// =====================================================
// INVOICES API
// =====================================================
export const invoicesAPI = {
  getAll: async (businessId, options = {}) => {
    let query = supabase
      .from('invoices')
      .select('*, invoice_lines (*)')
      .eq('business_id', businessId);

    if (options.status) query = query.eq('status', options.status);
    query = query.order('invoice_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_lines (*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (invoiceData, lines) => {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();
    if (invError) throw invError;

    const linesWithId = lines.map(line => ({ ...line, invoice_id: invoice.id }));
    const { data: invoiceLines, error: linesError } = await supabase
      .from('invoice_lines')
      .insert(linesWithId)
      .select();
    if (linesError) throw linesError;

    return { ...invoice, invoice_lines: invoiceLines };
  },

  update: async (id, updates, lines = null) => {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (invError) throw invError;

    if (lines) {
      const { error: deleteError } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', id);
      if (deleteError) throw deleteError;

      const linesWithId = lines.map(line => ({ ...line, invoice_id: id }));
      const { data: invoiceLines, error: linesError } = await supabase
        .from('invoice_lines')
        .insert(linesWithId)
        .select();
      if (linesError) throw linesError;

      return { ...invoice, invoice_lines: invoiceLines };
    }
    return invoice;
  },

  delete: async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
};

// =====================================================
// LOANS API
// =====================================================
export const loansAPI = {
  getAll: async (businessId) => {
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_payments (*)')
      .eq('business_id', businessId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_payments (*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (loanData) => {
    const { data, error } = await supabase
      .from('loans')
      .insert([loanData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw error;
  },

  addPayment: async (paymentData) => {
    const { data, error } = await supabase
      .from('loan_payments')
      .insert([paymentData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// =====================================================
// JOURNAL ENTRIES API
// =====================================================
export const journalEntriesAPI = {
  getAll: async (businessId, options = {}) => {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('business_id', businessId);

    if (options.startDate) query = query.gte('entry_date', options.startDate);
    if (options.endDate)   query = query.lte('entry_date', options.endDate);
    query = query.order('entry_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  create: async (entryData) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([entryData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) throw error;
  },

  post: async (id, userId) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({ is_posted: true, posted_at: new Date().toISOString(), posted_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// =====================================================
// REPORTS API
// =====================================================
export const reportsAPI = {
  getTrialBalance: async (businessId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },

  getBalanceSheet: async (businessId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('business_id', businessId)
      .in('type', ['asset', 'liability', 'equity'])
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },

  getIncomeStatement: async (businessId, startDate, endDate) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('business_id', businessId)
      .in('type', ['income', 'expense'])
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },

  // Fetch transaction lines for a date range for report calculations
  // transaction_lines has no business_id — join through transactions
  getTransactionLines: async (businessId, startDate, endDate) => {
    let query = supabase
      .from('transaction_lines')
      .select(`
        id,
        account_id,
        debit,
        credit,
        description,
        transaction:transactions!inner(
          id, transaction_date, description, is_deleted, business_id
        )
      `)
      .eq('transaction.business_id', businessId)
      .eq('transaction.is_deleted', false);

    if (startDate) query = query.gte('transaction.transaction_date', startDate);
    if (endDate)   query = query.lte('transaction.transaction_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};