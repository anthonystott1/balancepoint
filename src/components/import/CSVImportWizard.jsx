import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { transactionsAPI, importBatchesAPI, accountsAPI, tagsAPI } from '../../api/index';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, AlertTriangle, CheckCircle, Loader2, Plus } from 'lucide-react';

// ─── CSV Parser ───────────────────────────────────────────────────────────────
const parseCSV = (text) => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  for (const line of normalized.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      const next = trimmed[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') { field += '"'; i++; continue; }
        inQuotes = !inQuotes;
        continue;
      }
      if (c === ',' && !inQuotes) { fields.push(field.trim()); field = ''; continue; }
      field += c;
    }
    fields.push(field.trim());
    rows.push(fields);
  }
  return rows;
};

// ─── Date normalizer ──────────────────────────────────────────────────────────
const normalizeDate = (raw, dateFormat = 'MDY') => {
  if (!raw) return null;
  const s = raw.toString().trim().replace(/"/g, '');
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s);
    if (serial > 40000) {
      const d = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + serial * 86400000);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  const parts = s.split(/[\/\-\.]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    let month, day, year;
    if (dateFormat === 'YMD')      { [year, month, day] = parts; }
    else if (dateFormat === 'DMY') { [day, month, year] = parts; }
    else                           { [month, day, year] = parts; }
    if (year && year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    const m = parseInt(month), d = parseInt(day), y = parseInt(year);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const padded = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const check = new Date(padded + 'T00:00:00Z');
      if (!isNaN(check.getTime()) && check.getUTCFullYear() === y) return padded;
    }
  }
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() > 1900) return fallback.toISOString().split('T')[0];
  return null;
};

// ─── Amount parser ────────────────────────────────────────────────────────────
const parseAmount = (raw) => {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  const isNegative = s.startsWith('(') && s.endsWith(')');
  const cleaned = s.replace(/[$,\s()]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return null;
  return isNegative ? -Math.abs(value) : value;
};

// ─── Format detector ──────────────────────────────────────────────────────────
const detectFormat = (headers) => {
  const h = headers.map(x => x.toLowerCase());
  const suggestions = {};
  if (h.includes('date') && h.includes('amount') && h.includes('name')) {
    suggestions.date        = headers[h.indexOf('date')];
    suggestions.amount      = headers[h.indexOf('amount')];
    suggestions.description = headers[h.indexOf('name')];
    suggestions.vendor      = headers[h.indexOf('name')];
    if (h.includes('num'))   suggestions.reference = headers[h.indexOf('num')];
    if (h.includes('split')) suggestions.category  = headers[h.indexOf('split')];
    if (h.includes('memo'))  suggestions.memo      = headers[h.indexOf('memo')];
    return { format: 'QuickBooks', suggestions };
  }
  if (h.includes('posting date') || h.includes('date')) {
    suggestions.date = h.includes('posting date')
      ? headers[h.indexOf('posting date')]
      : headers[h.indexOf('date')];
  }
  if (h.includes('amount'))               suggestions.amount      = headers[h.indexOf('amount')];
  if (h.includes('description'))          suggestions.description = headers[h.indexOf('description')];
  if (h.includes('reference number'))     suggestions.reference   = headers[h.indexOf('reference number')];
  if (h.includes('check number'))         suggestions.reference   = headers[h.indexOf('check number')];
  if (h.includes('transaction category')) suggestions.category    = headers[h.indexOf('transaction category')];
  if (h.includes('type'))                 suggestions.category    = headers[h.indexOf('type')];
  return { format: 'Bank CSV', suggestions };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const guessAccountType = (categoryName) => {
  const lower = categoryName.toLowerCase();
  const incomeKeywords = ['income', 'revenue', 'sales', 'deposit', 'credit', 'refund', 'interest earned', 'payment received'];
  return incomeKeywords.some(k => lower.includes(k)) ? 'income' : 'expense';
};

const bankAccountLabel = (b) => {
  const typeLabels = {
    checking: 'Checking', savings: 'Savings', credit_card: 'Credit Card',
    cash: 'Cash', money_market: 'Money Market', line_of_credit: 'Line of Credit',
  };
  const last4 = b.account_number_last4 ? ` ····${b.account_number_last4}` : '';
  const type  = typeLabels[b.account_type] ?? b.account_type;
  return `${b.account_name}${last4} (${type})`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CSVImportWizard({ isOpen, onClose, accounts, bankAccounts = [] }) {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [mapping, setMapping] = useState({
    date: '', description: '', amount: '', reference: '',
    category: '', vendor: '', dateFormat: 'MDY',
  });
  // defaultAccount: chart-of-accounts asset account ID — used in transaction lines
  const [defaultAccount, setDefaultAccount] = useState('');
  // selectedBankAccount: bank_accounts row ID — stored on import_batches.account_id
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [preview, setPreview] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [accountResolutions, setAccountResolutions] = useState({});
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueVendors, setUniqueVendors] = useState([]);

  const findFallbackAccount = (type) => accounts.find(a => a.type === type)?.id || null;

  // ─── Import mutation ──────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      // 1. Resolve/create chart-of-accounts entries for categories
      const resolvedAccountMap = {};
      for (const [categoryName, resolution] of Object.entries(accountResolutions)) {
        if (resolution.action === 'use_existing' && resolution.accountId) {
          resolvedAccountMap[categoryName] = resolution.accountId;
        } else {
          const newAccount = await accountsAPI.create({
            business_id: currentBusiness.id,
            name:        categoryName,
            type:        resolution.type || 'expense',
            is_active:   true,
          });
          resolvedAccountMap[categoryName] = newAccount.id;
        }
      }

      // 2. Resolve/create vendor tags
      const vendorTagMap = {};
      if (mapping.vendor && uniqueVendors.length > 0) {
        const existingTags = await tagsAPI.getAll(currentBusiness.id);
        for (const vendorName of uniqueVendors) {
          if (!vendorName) continue;
          const existing = existingTags.find(
            t => t.name.toLowerCase() === vendorName.toLowerCase() && t.category === 'client'
          );
          if (existing) {
            vendorTagMap[vendorName] = existing.id;
          } else {
            const newTag = await tagsAPI.create({
              business_id: currentBusiness.id,
              name:        vendorName,
              category:    'client',
              color:       'blue',
              is_active:   true,
            });
            vendorTagMap[vendorName] = newTag.id;
          }
        }
      }

      // 3. Import transactions
      const validRows  = preview.filter(p => p.valid);
      const createdIds = [];
      const catIdx  = mapping.category  && mapping.category  !== 'none' ? headers.indexOf(mapping.category)  : -1;
      const vendIdx = mapping.vendor    && mapping.vendor    !== 'none' ? headers.indexOf(mapping.vendor)    : -1;

      for (const row of validRows) {
        const rawRow    = csvData[row.id];
        const absAmount = Math.abs(row.amount);
        const isDebit   = row.amount < 0;

        let offsetAccountId;
        if (catIdx >= 0 && rawRow?.[catIdx]) {
          const cat = rawRow[catIdx].trim();
          offsetAccountId = resolvedAccountMap[cat] || findFallbackAccount(isDebit ? 'expense' : 'income');
        } else {
          offsetAccountId = findFallbackAccount(isDebit ? 'expense' : 'income');
        }

        const lines = isDebit
          ? [
              { account_id: offsetAccountId, debit: absAmount, credit: 0,         description: row.description },
              { account_id: defaultAccount,  debit: 0,         credit: absAmount, description: row.description },
            ]
          : [
              { account_id: defaultAccount,  debit: absAmount, credit: 0,         description: row.description },
              { account_id: offsetAccountId, debit: 0,         credit: absAmount, description: row.description },
            ];

        const transaction = await transactionsAPI.create(
          {
            business_id:      currentBusiness.id,
            transaction_date: row.date,
            description:      row.description,
            source:           'import',
            is_cleared:       false,
            reference_number: row.reference || null,
          },
          lines
        );
        createdIds.push(transaction.id);

        if (vendIdx >= 0 && rawRow?.[vendIdx]) {
          const vendor = rawRow[vendIdx].trim();
          const tagId  = vendorTagMap[vendor];
          if (tagId) {
            await supabase.from('transaction_tags').insert({
              transaction_id: transaction.id,
              tag_id:         tagId,
              business_id:    currentBusiness.id,
            });
          }
        }
      }

      // 4. Create import batch
      // account_id references bank_accounts (not chart-of-accounts accounts)
      // selectedBankAccount is a bank_accounts.id — correct FK target
      await importBatchesAPI.create({
        business_id:     currentBusiness.id,
        account_id:      selectedBankAccount && selectedBankAccount !== 'none'
                           ? selectedBankAccount
                           : null,
        file_name:       file.name,
        imported_count:  createdIds.length,
        failed_count:    preview.filter(p => !p.valid).length,
        duplicate_count: 0,
        transaction_ids: createdIds,
        can_undo:        true,
      });

      return {
        importedCount:   createdIds.length,
        accountsCreated: Object.values(accountResolutions).filter(r => r.action === 'create').length,
        tagsCreated:     Object.keys(vendorTagMap).length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      setImportResult(result);
      setStep(5);
    },
  });

  const resetWizard = () => {
    setStep(1); setFile(null); setCsvData([]); setHeaders([]); setDetectedFormat('');
    setMapping({ date:'', description:'', amount:'', reference:'', category:'', vendor:'', dateFormat:'MDY' });
    setDefaultAccount(''); setSelectedBankAccount(''); setPreview([]); setImportResult(null);
    setAccountResolutions({}); setUniqueCategories([]); setUniqueVendors([]);
  };

  const handleClose = () => { resetWizard(); onClose(); };

  // ─── File parsing ─────────────────────────────────────────────────────────
  const parseFile = (uploadedFile) => {
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      const rows = parseCSV(text);
      if (rows.length < 2) { alert('CSV appears empty or could not be parsed.'); return; }
      const headerRow = rows[0];
      const dataRows  = rows.slice(1).filter(r => r.some(f => f !== ''));
      const { format, suggestions } = detectFormat(headerRow);
      setDetectedFormat(format);
      setHeaders(headerRow);
      setCsvData(dataRows);
      setMapping(prev => ({
        ...prev,
        date:        suggestions.date        || '',
        description: suggestions.description || '',
        amount:      suggestions.amount      || '',
        reference:   suggestions.reference   || '',
        category:    suggestions.category    || '',
        vendor:      suggestions.vendor      || '',
      }));
      setStep(2);
    };
    reader.readAsText(uploadedFile);
  };

  // ─── Build preview ────────────────────────────────────────────────────────
  const buildPreviewAndReview = () => {
    if (!mapping.date || !mapping.description || !mapping.amount || !defaultAccount) {
      alert('Please select a destination account and map Date, Description, and Amount columns.');
      return;
    }
    const dateIdx = headers.indexOf(mapping.date);
    const descIdx = headers.indexOf(mapping.description);
    const amtIdx  = headers.indexOf(mapping.amount);
    const refIdx  = mapping.reference && mapping.reference !== 'none' ? headers.indexOf(mapping.reference) : -1;
    const catIdx  = mapping.category  && mapping.category  !== 'none' ? headers.indexOf(mapping.category)  : -1;
    const vendIdx = mapping.vendor    && mapping.vendor    !== 'none' ? headers.indexOf(mapping.vendor)    : -1;

    if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
      alert('Could not find one or more mapped columns. Please re-check your mappings.');
      return;
    }

    const previewData = csvData.map((row, idx) => {
      const rawDate = row[dateIdx] ?? '';
      const rawDesc = row[descIdx] ?? '';
      const rawAmt  = row[amtIdx]  ?? '';
      const rawRef  = refIdx >= 0 ? (row[refIdx] ?? '') : '';
      const parsedDate   = normalizeDate(rawDate, mapping.dateFormat);
      const parsedAmount = parseAmount(rawAmt);
      const errors = [];
      if (!parsedDate)           errors.push(`Bad date: "${rawDate}"`);
      if (parsedAmount === null) errors.push(`Bad amount: "${rawAmt}"`);
      if (!rawDesc.trim())       errors.push('Missing description');
      return {
        id: idx, date: parsedDate ?? rawDate, description: rawDesc,
        amount: parsedAmount ?? 0, reference: rawRef,
        valid: errors.length === 0, error: errors.join(' | ') || null,
      };
    });
    setPreview(previewData);

    if (catIdx >= 0) {
      const cats = [...new Set(csvData.map(r => r[catIdx]?.trim()).filter(Boolean))];
      setUniqueCategories(cats);
      const resolutions = {};
      for (const cat of cats) {
        const existing = accounts.find(a => a.name.toLowerCase() === cat.toLowerCase());
        resolutions[cat] = existing
          ? { action: 'use_existing', accountId: existing.id, type: existing.type }
          : { action: 'create', type: guessAccountType(cat) };
      }
      setAccountResolutions(resolutions);
    }

    if (vendIdx >= 0) {
      setUniqueVendors([...new Set(csvData.map(r => r[vendIdx]?.trim()).filter(Boolean))]);
    }

    setStep(catIdx === -1 ? 4 : 3);
  };

  const assetAccounts      = accounts.filter(a => a.type === 'asset');
  const activeBankAccounts = bankAccounts.filter(b => b.is_active !== false);
  const validCount         = preview.filter(p => p.valid).length;
  const invalidCount       = preview.filter(p => !p.valid).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step < 5 && (
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{s}</div>
                {s < 4 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
            <span className="text-xs text-gray-400 ml-2">
              {step === 1 ? 'Upload' : step === 2 ? 'Map Columns' : step === 3 ? 'Review Accounts' : 'Preview & Import'}
            </span>
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="space-y-4">
            <Card
              className="p-12 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.name.toLowerCase().endsWith('.csv')) parseFile(f);
                else alert('Please drop a .csv file.');
              }}
            >
              <label className="flex flex-col items-center cursor-pointer gap-3">
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-lg font-medium text-gray-700">Drop CSV here or click to browse</p>
                <p className="text-sm text-gray-400">
                  Supports bank exports (Chase, BofA, Wells Fargo) and QuickBooks CSV
                </p>
                <input type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
              </label>
            </Card>
            <p className="text-xs text-gray-400 text-center">
              Needs at minimum: a date column, description column, and amount column.
            </p>
          </div>
        )}

        {/* ── Step 2: Map Columns ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <strong>{file?.name}</strong> — {csvData.length} rows &bull; {headers.length} columns
                </div>
                {detectedFormat && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                    {detectedFormat} detected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Columns: {headers.join(', ')}</p>
            </div>

            {detectedFormat && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✓ Format auto-detected — column mappings pre-filled. Review and adjust if needed.
              </div>
            )}

            {/* Account pickers — side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {/* Chart-of-accounts destination — goes into transaction lines */}
              <div>
                <Label>
                  Ledger Account <span className="text-red-500">*</span>
                </Label>
                <Select value={defaultAccount} onValueChange={setDefaultAccount}>
                  <SelectTrigger className="mt-1.5 bg-white">
                    <SelectValue placeholder="Select ledger account" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Chart-of-accounts entry these transactions post against.
                </p>
              </div>

              {/* Bank account — stored on import batch for reconciliation tracking */}
              <div>
                <Label>
                  Bank Account <span className="text-gray-400">(optional)</span>
                </Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger className="mt-1.5 bg-white">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activeBankAccounts.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {bankAccountLabel(b)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Links this import to a bank account for reconciliation.
                </p>
              </div>
            </div>

            {/* Column mappings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date Column <span className="text-red-500">*</span></Label>
                <Select value={mapping.date} onValueChange={(v) => setMapping(m => ({...m, date: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Format</Label>
                <Select value={mapping.dateFormat} onValueChange={(v) => setMapping(m => ({...m, dateFormat: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MDY">Month/Day/Year — US (4/23/2026)</SelectItem>
                    <SelectItem value="DMY">Day/Month/Year — EU (23/4/2026)</SelectItem>
                    <SelectItem value="YMD">Year/Month/Day — ISO (2026-04-23)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description Column <span className="text-red-500">*</span></Label>
                <Select value={mapping.description} onValueChange={(v) => setMapping(m => ({...m, description: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount Column <span className="text-red-500">*</span></Label>
                <Select value={mapping.amount} onValueChange={(v) => setMapping(m => ({...m, amount: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Negative = money out. Handles $, commas, parentheses.</p>
              </div>

              <div>
                <Label>Category Column <span className="text-gray-400">(optional)</span></Label>
                <Select value={mapping.category} onValueChange={(v) => setMapping(m => ({...m, category: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Auto-creates expense/income accounts.</p>
              </div>

              <div>
                <Label>Vendor/Name Column <span className="text-gray-400">(optional)</span></Label>
                <Select value={mapping.vendor} onValueChange={(v) => setMapping(m => ({...m, vendor: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Creates vendor tags for filtering.</p>
              </div>

              <div className="col-span-2">
                <Label>Reference Column <span className="text-gray-400">(optional)</span></Label>
                <Select value={mapping.reference} onValueChange={(v) => setMapping(m => ({...m, reference: v}))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={buildPreviewAndReview} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Account Review ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Review Expense/Income Accounts</p>
              <p>
                We found <strong>{uniqueCategories.length}</strong> categories in your CSV.
                Missing accounts will be created automatically.
              </p>
            </div>

            {uniqueVendors.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✓ <strong>{uniqueVendors.length}</strong> vendor tag{uniqueVendors.length !== 1 ? 's' : ''} will be created or matched:{' '}
                {uniqueVendors.slice(0, 5).join(', ')}{uniqueVendors.length > 5 ? ` +${uniqueVendors.length - 5} more` : ''}
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Category in CSV</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Account Type</th>
                    <th className="px-3 py-2 text-left">Map To</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uniqueCategories.map(cat => {
                    const resolution = accountResolutions[cat] || { action: 'create', type: 'expense' };
                    const isMatched  = resolution.action === 'use_existing';
                    return (
                      <tr key={cat}>
                        <td className="px-3 py-2 font-medium">{cat}</td>
                        <td className="px-3 py-2">
                          {isMatched ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />Matched
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                              <Plus className="w-3 h-3 mr-1" />Will Create
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={resolution.type || 'expense'}
                            onValueChange={(v) => setAccountResolutions(prev => ({
                              ...prev, [cat]: { ...prev[cat], type: v }
                            }))}
                          >
                            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="liability">Liability</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={isMatched ? resolution.accountId : 'create_new'}
                            onValueChange={(v) => {
                              if (v === 'create_new') {
                                setAccountResolutions(prev => ({
                                  ...prev, [cat]: { ...prev[cat], action: 'create', accountId: undefined }
                                }));
                              } else {
                                const acct = accounts.find(a => a.id === v);
                                setAccountResolutions(prev => ({
                                  ...prev, [cat]: { action: 'use_existing', accountId: v, type: acct?.type || 'expense' }
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create_new">
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3 h-3" />Create "{cat}"
                                </span>
                              </SelectItem>
                              {accounts
                                .filter(a => a.type === (resolution.type || 'expense'))
                                .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                              }
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                Preview Transactions
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Preview ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
                ✓ {validCount} of {csvData.length} rows ready
              </div>
              {invalidCount > 0 && (
                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 font-medium">
                  ✗ {invalidCount} rows will be skipped
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Transactions import as <strong>uncleared</strong> — reconcile them later.
              {uniqueCategories.length > 0 && ` Each transaction will be wired to its category account.`}
            </p>

            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.slice(0, 15).map(row => (
                    <tr key={row.id} className={!row.valid ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2">
                        {row.valid
                          ? <CheckCircle className="w-4 h-4 text-green-600" />
                          : <AlertTriangle className="w-4 h-4 text-red-500" title={row.error} />}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.date}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]" title={row.description}>
                        {row.description}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${row.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {row.amount < 0 ? '-' : '+'}${Math.abs(row.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <details className="text-xs text-gray-500 cursor-pointer">
                <summary className="hover:text-gray-700">Show parse errors ({invalidCount})</summary>
                <ul className="mt-2 space-y-1 pl-2">
                  {preview.filter(r => !r.valid).map(r => (
                    <li key={r.id} className="text-red-600">Row {r.id + 1}: {r.error}</li>
                  ))}
                </ul>
              </details>
            )}

            {importMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                Import failed: {importMutation.error?.message || 'Unknown error — check console.'}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(uniqueCategories.length > 0 ? 3 : 2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || validCount === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {importMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                  : `Import ${validCount} Transactions`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Success ── */}
        {step === 5 && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Import Complete</h3>
            <div className="flex justify-center gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{importResult?.importedCount}</p>
                <p className="text-gray-500">Transactions</p>
              </div>
              {importResult?.accountsCreated > 0 && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{importResult.accountsCreated}</p>
                  <p className="text-gray-500">Accounts Created</p>
                </div>
              )}
              {importResult?.tagsCreated > 0 && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{importResult.tagsCreated}</p>
                  <p className="text-gray-500">Vendor Tags</p>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm">from <strong>{file?.name}</strong></p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-left max-w-sm mx-auto">
              <p className="font-medium mb-1">Next step</p>
              <p>Go to <strong>Reconciliation</strong> to match these against your bank statement and mark them cleared.</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={resetWizard}>Import Another File</Button>
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}