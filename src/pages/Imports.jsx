// src/pages/Imports.jsx
// BalancePoint -- QuickBooks Import Wizard
//
// Accepts QB Excel exports:
//   * Journal (.xlsx)           -> transactions (primary TX source)
//   * Trial Balance (.xlsx)     -> chart of accounts + opening balances
//   * Customer Contact List     -> clients table
//   * Vendor Contact List       -> contractors table
//   * Employee Contact List     -> tags (category: 'other') -- future payroll
//
// FILE FORMAT FACTS (confirmed from real exports):
//   Journal cols (B-I): Date | TxType | Num | Name | Memo | Account | Debit | Credit
//     - Header row: col B has date, cols C-I have values
//     - Line rows:  cols B-F are null, col G=account, H=debit or I=credit
//     - Totals row: cols B-G null, BOTH H and I have the same value -> skip
//     - Blank row:  all null -> skip
//     - Sub-accounts use colon: "Insurance Expense:Health Insurance"
//     - Check numbers are QB floats (4090.166...) -- store as string reference
//
//   Trial Balance cols (A-C): AccountName | Debit | Credit
//     - Values stored as Excel formula strings: "=94426.27" -> strip "=" prefix
//     - Sub-accounts use colon: "Employee Wages:Payroll expense"
//     - Skip rows: header (row 0-3), TOTAL row, timestamp row
//
//   Customers / Vendors / Employees cols (B-G):
//     Name | Phone | Email | FullName | Address | AccountNum(vendors)
//     - Row 0-3: company name / report title / blank / column headers -> skip
//     - Data starts at row 4 (0-indexed)
//
// SCHEMA RULES:
//   * transactions: NO amount column
//   * transaction_lines: NO business_id, uses debit/credit
//   * Radix SelectItem: never value={null} or value=''
//   * businesses.accounting_method: only 'cash' or 'accrual'

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useBusiness } from '../contexts/BusinessContext';
import { transactionsAPI, accountsAPI } from '../api/index';
import { supabase } from '../lib/supabase';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  Upload, CheckCircle, Loader2, FileSpreadsheet, ChevronRight,
  BookOpen, Receipt, ArrowRight, X, Info, AlertCircle,
  Users, Building2, RotateCcw, Trash2, FileText
} from 'lucide-react';

// ?????????????????????????????????????????????????????????????????????????????
// HELPERS
// ?????????????????????????????????????????????????????????????????????????????

// Strip Excel formula prefix and parse to float
const parseValue = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = v.toString().trim().replace(/^=/, '').replace(/[$,]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

// MM/DD/YYYY -> YYYY-MM-DD
const normalizeDate = (raw) => {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s || s === 'Date') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split('/');
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) y = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  const f = new Date(s);
  return isNaN(f.getTime()) ? null : f.toISOString().split('T')[0];
};

// Classify account type from name
const ASSET_KW  = ['bank','chase','zions','wells fargo','checking','savings','cash',
                   'receivable','inventory','equipment','furniture','depreciation',
                   'goodwill','ed jones','edward jones','undeposited'];
const LIAB_KW   = ['payable','liability','credit card','amex','american express',
                   'loan','mortgage','n/p','payroll liab'];
const EQUITY_KW = ['draw','equity','retained','capital','partner','member','opening balance'];
const INCOME_KW = ['income','revenue','service','therapy service','sales','dividend',
                   'gain','paycheck'];

const classifyType = (name) => {
  const n = (name || '').toLowerCase();
  if (EQUITY_KW.some(k => n.includes(k))) return 'equity';
  if (INCOME_KW.some(k => n.includes(k))) return 'income';
  if (LIAB_KW.some(k => n.includes(k)))   return 'liability';
  if (ASSET_KW.some(k => n.includes(k)))  return 'asset';
  return 'expense';
};

// Parse "Parent:Child" -> { parent, child }
// Returns { name: fullName, parent: parentName|null, leaf: leafName }
const parseAccountName = (raw) => {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  const parts = s.split(':').map(p => p.trim());
  if (parts.length === 1) return { name: s, parent: null, leaf: s };
  return { name: s, parent: parts[0], leaf: parts[parts.length - 1] };
};

// ?????????????????????????????????????????????????????????????????????????????
// SHEET TYPE DETECTION
// ?????????????????????????????????????????????????????????????????????????????
const TYPES = {
  JOURNAL:       'Journal',
  TRIAL_BALANCE: 'Trial Balance',
  CUSTOMERS:     'Customers',
  VENDORS:       'Vendors',
  EMPLOYEES:     'Employees',
  UNKNOWN:       'Unknown',
};

const detectType = (sheetName, firstRows) => {
  const name = (sheetName || '').toLowerCase();
  // Check sheet name first
  if (name.includes('journal'))        return TYPES.JOURNAL;
  if (name.includes('trial'))          return TYPES.TRIAL_BALANCE;
  if (name.includes('customer'))       return TYPES.CUSTOMERS;
  if (name.includes('vendor'))         return TYPES.VENDORS;
  if (name.includes('employee'))       return TYPES.EMPLOYEES;
  // Fall back to content sniffing (row 4 = header row pattern)
  const headerRow = (firstRows[4] || []).map(c => (c||'').toString().toLowerCase());
  const joined = headerRow.join(' ');
  if (joined.includes('transaction type') && joined.includes('debit')) return TYPES.JOURNAL;
  if (firstRows.some(r => r && r[0] && r[0].toString().toLowerCase().includes('trial balance'))) return TYPES.TRIAL_BALANCE;
  if (joined.includes('customer'))   return TYPES.CUSTOMERS;
  if (joined.includes('vendor'))     return TYPES.VENDORS;
  if (joined.includes('employee'))   return TYPES.EMPLOYEES;
  return TYPES.UNKNOWN;
};

// ?????????????????????????????????????????????????????????????????????????????
// PARSERS -- return structured data ready for import
// ?????????????????????????????????????????????????????????????????????????????

// Returns { accounts: [{name, type, parent, leaf, debit, credit}], companyName }
const parseTrialBalance = (rows) => {
  const accounts = [];
  let companyName = rows[0]?.[0] || '';

  for (const row of rows) {
    const name = row[0];
    if (!name || typeof name !== 'string') continue;
    const n = name.trim();
    if (!n) continue;
    // Skip report meta rows
    if (n.toLowerCase().includes('trial balance')) continue;
    if (n.toLowerCase().includes('total')) continue;
    if (/^(as of|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(n)) continue;

    const debit  = parseValue(row[1]);
    const credit = parseValue(row[2]);

    const parsed = parseAccountName(n);
    if (!parsed) continue;

    accounts.push({
      name:   parsed.name,
      leaf:   parsed.leaf,
      parent: parsed.parent,
      type:   classifyType(parsed.leaf || parsed.name),
      debit:  debit  || 0,
      credit: credit || 0,
    });
  }

  return { accounts, companyName: companyName.toString().trim() };
};

// Returns { clients: [{client_name, contact_person, phone, email, address}] }
const parseCustomers = (rows) => {
  const clients = [];
  // Skip rows 0-3 (company name, report title, blank, column headers)
  for (const row of rows.slice(4)) {
    const name = row[1];
    if (!name || typeof name !== 'string') continue;
    const n = name.trim();
    if (!n || n.toLowerCase() === 'customer') continue;
    clients.push({
      client_name:    n,
      phone:          row[2] ? row[2].toString().trim() : null,
      email:          row[3] ? row[3].toString().trim() : null,
      contact_person: row[4] ? row[4].toString().trim() : null,
      address:        row[5] ? row[5].toString().replace(/_x000D_/g, '').trim() : null,
    });
  }
  return { clients };
};

// Returns { vendors: [{full_legal_name, phone, email, contact_person, address}] }
const parseVendors = (rows) => {
  const vendors = [];
  for (const row of rows.slice(4)) {
    const name = row[1];
    if (!name || typeof name !== 'string') continue;
    const n = name.trim();
    if (!n || n.toLowerCase() === 'vendor') continue;
    vendors.push({
      full_legal_name: n,
      phone:           row[2] ? row[2].toString().trim() : null,
      email:           row[3] ? row[3].toString().trim() : null,
      contact_person:  row[4] ? row[4].toString().trim() : null,
      address:         row[5] ? row[5].toString().replace(/_x000D_/g, '').trim() : null,
    });
  }
  return { vendors };
};

// Returns { employees: [{name, phone, email}] }
const parseEmployees = (rows) => {
  const employees = [];
  for (const row of rows.slice(4)) {
    const name = row[1];
    if (!name || typeof name !== 'string') continue;
    const n = name.trim();
    if (!n || n.toLowerCase() === 'employee') continue;
    employees.push({
      name:  n,
      phone: row[2] ? row[2].toString().trim() : null,
      email: row[3] ? row[3].toString().trim() : null,
    });
  }
  return { employees };
};

// Returns { transactions: [{date, txType, reference, name, memo, lines:[{account,debit,credit}]}] }
const parseJournal = (rows) => {
  const transactions = [];
  let i = 0;

  // Skip to first data row (past header block -- look for row with col B = 'Date')
  while (i < rows.length && !(rows[i][1] === 'Date')) i++;
  i++; // skip the header row itself

  while (i < rows.length) {
    const row = rows[i];

    // All-null row = blank separator between transactions, skip
    if (!row || !row.some(c => c !== null && c !== undefined)) { i++; continue; }

    const colB = row[1]; // Date
    const colC = row[2]; // Transaction Type
    const colG = row[6]; // Account
    const colH = row[7]; // Debit
    const colI = row[8]; // Credit

    // Totals row: cols B-G all null, both H and I have values -> skip
    if (!colB && !colG && colH !== null && colH !== undefined &&
        colI !== null && colI !== undefined) { i++; continue; }

    // Transaction header row: col B has a date string
    if (colB && typeof colB === 'string' && colB !== 'Date') {
      const date = normalizeDate(colB);
      if (!date) { i++; continue; }

      const txType    = colC ? colC.toString().trim() : '';
      const rawNum    = row[3];
      // QB check numbers are fractional floats -- convert to readable string
      const reference = rawNum !== null && rawNum !== undefined
        ? Math.round(parseFloat(rawNum)).toString()
        : '';
      const name      = row[4] ? row[4].toString().trim() : '';
      const memo      = row[5] ? row[5].toString().trim() : '';

      // First account line is on the same row as the header
      const lines = [];
      if (colG) {
        const d = parseValue(colH);
        const c = parseValue(colI);
        if (d || c) {
          lines.push({ account: colG.toString().trim(), debit: d || 0, credit: c || 0 });
        }
      }

      // Collect continuation lines
      i++;
      while (i < rows.length) {
        const next = rows[i];
        if (!next || !next.some(c => c !== null && c !== undefined)) break; // blank separator
        const nb = next[1];
        const ng = next[6];
        const nh = next[7];
        const ni = next[8];
        // Totals row
        if (!nb && !ng && nh !== null && nh !== undefined &&
            ni !== null && ni !== undefined) { i++; break; }
        // New transaction header
        if (nb && typeof nb === 'string' && nb !== 'Date' && normalizeDate(nb)) break;
        // Continuation line
        if (!nb && ng) {
          const d = parseValue(nh);
          const c = parseValue(ni);
          if (d || c) {
            lines.push({ account: ng.toString().trim(), debit: d || 0, credit: c || 0 });
          }
        }
        i++;
      }

      if (lines.length > 0) {
        transactions.push({ date, txType, reference, name, memo, lines });
      }
      continue;
    }

    i++;
  }

  return { transactions };
};

// ?????????????????????????????????????????????????????????????????????????????
// WORKBOOK PARSER -- dispatches to correct parser per sheet
// ?????????????????????????????????????????????????????????????????????????????
const parseWorkbook = (workbook, fileName) => {
  const results = [];
  for (const sheetName of workbook.SheetNames) {
    const ws   = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const firstRows = rows.slice(0, 8);
    const type = detectType(sheetName, firstRows);
    let parsed = null;
    let count  = 0;

    if (type === TYPES.TRIAL_BALANCE) {
      parsed = parseTrialBalance(rows);
      count  = parsed.accounts.length;
    } else if (type === TYPES.CUSTOMERS) {
      parsed = parseCustomers(rows);
      count  = parsed.clients.length;
    } else if (type === TYPES.VENDORS) {
      parsed = parseVendors(rows);
      count  = parsed.vendors.length;
    } else if (type === TYPES.EMPLOYEES) {
      parsed = parseEmployees(rows);
      count  = parsed.employees.length;
    } else if (type === TYPES.JOURNAL) {
      parsed = parseJournal(rows);
      count  = parsed.transactions.length;
    }

    results.push({ fileName, sheetName, type, parsed, count, selected: type !== TYPES.UNKNOWN });
  }
  return results;
};

// ?????????????????????????????????????????????????????????????????????????????
// IMPORT ENGINE
// ?????????????????????????????????????????????????????????????????????????????
const runImport = async ({ sheets, businessId, onProgress, onLog }) => {
  const log = (msg, type = 'info') => onLog({ msg, type });
  const totals = { accounts: 0, clients: 0, vendors: 0, employees: 0, transactions: 0, failed: 0 };

  // accountIdMap: lowercase account name -> supabase id
  const accountIdMap = {};

  const loadExistingAccounts = async () => {
    const { data = [] } = await supabase
      .from('accounts').select('id, name').eq('business_id', businessId);
    for (const a of data) accountIdMap[a.name.toLowerCase()] = a.id;
  };

  const getOrCreate = async (name, typeHint) => {
    if (!name) return null;
    const key = name.toLowerCase().trim();
    if (accountIdMap[key]) return accountIdMap[key];
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ business_id: businessId, name: name.trim(),
                   type: classifyType(name) || typeHint || 'expense', is_active: true }])
        .select('id').single();
      if (error) throw error;
      accountIdMap[key] = data.id;
      return data.id;
    } catch { return null; }
  };

  // Resolve "Parent:Child" account name -> id
  // Tries child first, then parent as fallback
  const resolveAccount = async (raw) => {
    if (!raw) return null;
    const key = raw.toLowerCase().trim();
    if (accountIdMap[key]) return accountIdMap[key];
    // Has colon -> try child leaf, then full name, then parent
    if (raw.includes(':')) {
      const parts  = raw.split(':').map(p => p.trim());
      const leaf   = parts[parts.length - 1];
      const parent = parts[0];
      // Try exact full name
      const fullId = await getOrCreate(raw, classifyType(leaf));
      if (fullId) return fullId;
      // Try leaf
      const leafKey = leaf.toLowerCase();
      if (accountIdMap[leafKey]) return accountIdMap[leafKey];
      // Fall back to parent
      const parentKey = parent.toLowerCase();
      if (accountIdMap[parentKey]) return accountIdMap[parentKey];
      return await getOrCreate(leaf, classifyType(leaf));
    }
    return await getOrCreate(raw, classifyType(raw));
  };

  // ?? 1. Accounts (Trial Balance) ????????????????????????????????????????????
  const tbSheet = sheets.find(s => s.type === TYPES.TRIAL_BALANCE && s.selected);
  if (tbSheet) {
    log(`Creating accounts from Trial Balance?`);
    await loadExistingAccounts();

    const { accounts } = tbSheet.parsed;

    // First pass: top-level accounts (no parent)
    for (const acc of accounts.filter(a => !a.parent)) {
      const key = acc.name.toLowerCase();
      if (accountIdMap[key]) continue;
      try {
        const { data, error } = await supabase
          .from('accounts')
          .insert([{ business_id: businessId, name: acc.name,
                     type: acc.type, is_active: true }])
          .select('id').single();
        if (error) throw error;
        accountIdMap[key] = data.id;
        totals.accounts++;
      } catch (err) {
        log(`  ? Account "${acc.name}": ${err.message}`, 'warn');
      }
    }

    // Second pass: sub-accounts (parent must exist)
    for (const acc of accounts.filter(a => a.parent)) {
      const key       = acc.name.toLowerCase();
      const parentKey = acc.parent.toLowerCase();
      if (accountIdMap[key]) continue;
      try {
        const { data, error } = await supabase
          .from('accounts')
          .insert([{ business_id: businessId, name: acc.name,
                     type: acc.type,
                     parent_account_id: accountIdMap[parentKey] || null,
                     is_active: true }])
          .select('id').single();
        if (error) throw error;
        accountIdMap[key] = data.id;
        totals.accounts++;
      } catch (err) {
        log(`  ? Sub-account "${acc.name}": ${err.message}`, 'warn');
      }
    }

    log(`  ? ${totals.accounts} accounts created`, 'success');
    onProgress(15);

    // Opening balance journal entry
    const withBalances = accounts.filter(a => (a.debit || 0) + (a.credit || 0) > 0);
    if (withBalances.length > 0) {
      log(`Creating opening balance entry (${withBalances.length} accounts)?`);
      const obeKey = 'opening balance equity';
      await getOrCreate('Opening Balance Equity', 'equity');

      const lines = [];
      let totalD = 0, totalC = 0;
      for (const acc of withBalances) {
        const id = accountIdMap[acc.name.toLowerCase()];
        if (!id) continue;
        if ((acc.debit || 0) > 0) {
          lines.push({ account_id: id, debit: acc.debit, credit: 0, description: 'Opening balance' });
          totalD += acc.debit;
        }
        if ((acc.credit || 0) > 0) {
          lines.push({ account_id: id, debit: 0, credit: acc.credit, description: 'Opening balance' });
          totalC += acc.credit;
        }
      }
      // Balance with OBE
      const diff = Math.round((totalD - totalC) * 100) / 100;
      const obeId = accountIdMap[obeKey];
      if (obeId && Math.abs(diff) > 0.01) {
        lines.push(diff > 0
          ? { account_id: obeId, debit: 0,    credit: diff, description: 'Opening balance offset' }
          : { account_id: obeId, debit: -diff, credit: 0,   description: 'Opening balance offset' }
        );
      }
      try {
        await transactionsAPI.create(
          { business_id: businessId,
            transaction_date: new Date().toISOString().split('T')[0],
            description: 'QuickBooks Opening Balances', source: 'import', is_cleared: true },
          lines
        );
        log(`  ? Opening balance entry created`, 'success');
      } catch (err) {
        log(`  ? Opening balance entry failed: ${err.message}`, 'warn');
      }
    }
  }
  onProgress(25);

  // ?? 2. Clients (Customers) ?????????????????????????????????????????????????
  const custSheet = sheets.find(s => s.type === TYPES.CUSTOMERS && s.selected);
  if (custSheet) {
    log(`Importing ${custSheet.parsed.clients.length} customers?`);
    const { data: existing = [] } = await supabase
      .from('clients').select('client_name').eq('business_id', businessId);
    const existingNames = new Set(existing.map(c => c.client_name.toLowerCase()));

    for (const c of custSheet.parsed.clients) {
      if (existingNames.has(c.client_name.toLowerCase())) continue;
      try {
        const { error } = await supabase.from('clients').insert([{
          business_id: businessId, client_name: c.client_name,
          contact_person: c.contact_person || null, phone: c.phone || null,
          email: c.email || null, address: c.address || null, is_active: true,
        }]);
        if (error) throw error;
        totals.clients++;
      } catch (err) {
        log(`  ? Client "${c.client_name}": ${err.message}`, 'warn');
      }
    }
    log(`  ? ${totals.clients} clients created`, 'success');
  }
  onProgress(35);

  // ?? 3. Vendors / Contractors ???????????????????????????????????????????????
  const vendSheet = sheets.find(s => s.type === TYPES.VENDORS && s.selected);
  if (vendSheet) {
    log(`Importing ${vendSheet.parsed.vendors.length} vendors?`);
    const { data: existing = [] } = await supabase
      .from('contractors').select('full_legal_name').eq('business_id', businessId);
    const existingNames = new Set(existing.map(c => c.full_legal_name.toLowerCase()));

    // Parse address into components where possible
    const parseAddress = (raw) => {
      if (!raw) return { line1: null, city: 'Unknown', state: 'XX', zip: '00000' };
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const line1 = lines[0] || null;
      // Try to parse "City ST ZIP" from last line
      const lastLine = lines[lines.length - 1] || '';
      const m = lastLine.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
      if (m) return { line1, city: m[1].trim(), state: m[2], zip: m[3] };
      return { line1, city: 'Unknown', state: 'XX', zip: '00000' };
    };

    for (const v of vendSheet.parsed.vendors) {
      if (existingNames.has(v.full_legal_name.toLowerCase())) continue;
      const addr = parseAddress(v.address);
      try {
        const { error } = await supabase.from('contractors').insert([{
          business_id:     businessId,
          full_legal_name: v.full_legal_name,
          email:           v.email    || null,
          phone:           v.phone    || null,
          address_line1:   addr.line1 || null,
          city:            addr.city,
          state:           addr.state,
          zip_code:        addr.zip,
          // Tax ID required by schema -- placeholder, must be filled manually
          tax_id:          'UNKNOWN',
          tax_id_type:     'ssn',
          w9_collected:    false,
          is_active:       true,
        }]);
        if (error) throw error;
        totals.vendors++;
      } catch (err) {
        log(`  ? Vendor "${v.full_legal_name}": ${err.message}`, 'warn');
      }
    }
    log(`  ? ${totals.vendors} vendors created`, 'success');
  }
  onProgress(45);

  // ?? 4. Employees (as tags) ?????????????????????????????????????????????????
  const empSheet = sheets.find(s => s.type === TYPES.EMPLOYEES && s.selected);
  if (empSheet) {
    log(`Importing ${empSheet.parsed.employees.length} employees as tags?`);
    const { data: existing = [] } = await supabase
      .from('tags').select('name').eq('business_id', businessId).eq('category', 'other');
    const existingNames = new Set(existing.map(t => t.name.toLowerCase()));
    let created = 0;
    for (const e of empSheet.parsed.employees) {
      if (existingNames.has(e.name.toLowerCase())) continue;
      try {
        const { error } = await supabase.from('tags').insert([{
          business_id: businessId, name: e.name,
          category: 'other', color: 'gray', is_active: true,
        }]);
        if (error) throw error;
        created++;
        totals.employees++;
      } catch (err) {
        log(`  ? Employee tag "${e.name}": ${err.message}`, 'warn');
      }
    }
    log(`  ? ${created} employees saved as tags`, 'success');
  }
  onProgress(50);

  // ?? 5. Transactions (Journal) ??????????????????????????????????????????????
  const journalSheet = sheets.find(s => s.type === TYPES.JOURNAL && s.selected);
  if (journalSheet) {
    // Refresh account map to include anything just created
    await loadExistingAccounts();

    const { transactions } = journalSheet.parsed;
    log(`Importing ${transactions.length} transactions?`);

    const BATCH = 50;
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      // Resolve all account names -> IDs
      const resolvedLines = [];
      for (const line of tx.lines) {
        const id = await resolveAccount(line.account);
        if (!id) {
          // Last resort -- uncategorized
          const fallback = line.debit > 0
            ? await getOrCreate('Uncategorized Expense', 'expense')
            : await getOrCreate('Uncategorized Income', 'income');
          if (fallback) resolvedLines.push({ account_id: fallback, debit: line.debit, credit: line.credit, description: tx.memo || tx.name });
          continue;
        }
        resolvedLines.push({ account_id: id, debit: line.debit, credit: line.credit,
                             description: tx.memo || tx.name || tx.txType });
      }

      if (resolvedLines.length < 2) { totals.failed++; continue; }

      try {
        const desc = [tx.name, tx.memo].filter(Boolean).join(' -- ') || tx.txType || 'Imported';
        await transactionsAPI.create(
          { business_id: businessId, transaction_date: tx.date,
            description: desc, source: 'import', is_cleared: true,
            reference_number: tx.reference || null },
          resolvedLines
        );
        totals.transactions++;
      } catch (err) {
        totals.failed++;
        if (totals.failed <= 5)
          log(`  ? TX failed (${tx.date} ${tx.name}): ${err.message}`, 'warn');
      }

      // Progress + yield every batch
      if ((i + 1) % BATCH === 0) {
        onProgress(50 + Math.round(((i + 1) / transactions.length) * 48));
        await new Promise(r => setTimeout(r, 0));
        log(`  ?${i + 1} / ${transactions.length} transactions`);
      }
    }
    log(`  ? ${totals.transactions} transactions created, ${totals.failed} failed`,
        totals.failed === 0 ? 'success' : 'warn');
  }

  onProgress(100);
  return totals;
};

// ?????????????????????????????????????????????????????????????????????????????
// TYPE META (colors, icons, labels)
// ?????????????????????????????????????????????????????????????????????????????
const TYPE_META = {
  [TYPES.JOURNAL]:       { color: 'amber',  Icon: Receipt,       label: 'Journal / Transactions' },
  [TYPES.TRIAL_BALANCE]: { color: 'violet', Icon: BookOpen,      label: 'Trial Balance / Accounts' },
  [TYPES.CUSTOMERS]:     { color: 'green',  Icon: Users,         label: 'Customers' },
  [TYPES.VENDORS]:       { color: 'orange', Icon: Building2,     label: 'Vendors / Contractors' },
  [TYPES.EMPLOYEES]:     { color: 'pink',   Icon: Users,         label: 'Employees' },
  [TYPES.UNKNOWN]:       { color: 'gray',   Icon: FileText,      label: 'Unknown' },
};

// ?????????????????????????????????????????????????????????????????????????????
// COMPONENT
// ?????????????????????????????????????????????????????????????????????????????
function ImportsContent() {
  const { currentBusiness } = useBusiness();
  const [step, setStep]         = useState(1);
  const [sheets, setSheets]     = useState([]);   // all parsed sheets across all files
  const [progress, setProgress] = useState(0);
  const [logs, setLogs]         = useState([]);
  const [result, setResult]     = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const logEndRef = useRef(null);

  const addLog = useCallback((entry) => {
    setLogs(prev => {
      const next = [...prev, entry];
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
      return next;
    });
  }, []);

  // ?? File handling ????????????????????????????????????????????????????????
  const processFiles = (fileList) => {
    const files = Array.from(fileList).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    if (!files.length) return;
    let pending = files.length;
    const allSheets = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const parsed = parseWorkbook(wb, file.name);
        allSheets.push(...parsed);
        pending--;
        if (pending === 0) {
          setSheets(prev => {
            // Deduplicate by fileName+sheetName
            const existing = new Set(prev.map(s => `${s.fileName}::${s.sheetName}`));
            const newOnes  = allSheets.filter(s => !existing.has(`${s.fileName}::${s.sheetName}`));
            return [...prev, ...newOnes];
          });
          if (step === 1) setStep(2);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const removeSheet = (idx) => setSheets(prev => prev.filter((_, i) => i !== idx));
  const toggleSheet = (idx) => setSheets(prev =>
    prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s)
  );

  const startImport = async () => {
    setStep(3);
    setLogs([]);
    setProgress(0);
    try {
      const totals = await runImport({
        sheets: sheets.filter(s => s.selected),
        businessId: currentBusiness.id,
        onProgress: setProgress,
        onLog: addLog,
      });
      setResult(totals);
      setStep(4);
    } catch (err) {
      addLog({ msg: `Fatal error: ${err.message}`, type: 'error' });
      setProgress(100);
    }
  };

  const reset = () => {
    setStep(1); setSheets([]); setProgress(0); setLogs([]); setResult(null);
  };

  // Summary counts for confirm screen
  const selectedSheets  = sheets.filter(s => s.selected);
  const hasJournal      = selectedSheets.some(s => s.type === TYPES.JOURNAL);
  const hasTB           = selectedSheets.some(s => s.type === TYPES.TRIAL_BALANCE);
  const totalTx         = selectedSheets.filter(s => s.type === TYPES.JOURNAL)
                            .reduce((n, s) => n + s.count, 0);
  const totalAccounts   = selectedSheets.filter(s => s.type === TYPES.TRIAL_BALANCE)
                            .reduce((n, s) => n + s.count, 0);

  const STEPS = ['Upload', 'Review', 'Importing', 'Done'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import from QuickBooks</h1>
            <p className="text-sm text-gray-500">
              Migrate accounts, transactions, clients, and vendors into{' '}
              <span className="font-medium text-gray-700">{currentBusiness?.display_name}</span>
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done    = step > n;
            const current = step === n;
            return (
              <React.Fragment key={n}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done    ? 'bg-emerald-500 text-white' :
                    current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                              'bg-gray-200 text-gray-400'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    current ? 'text-indigo-700' : done ? 'text-emerald-600' : 'text-gray-400'
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 transition-all ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ?? Step 1 & 2: Upload + Review (combined -- upload stays visible) ?? */}
        {(step === 1 || step === 2) && (
          <div className="space-y-4">
            {/* Drop zone */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="pt-6 pb-6">
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
                  onClick={() => document.getElementById('qb-import-input').click()}
                >
                  <input
                    id="qb-import-input" type="file" accept=".xlsx,.xls"
                    multiple className="hidden"
                    onChange={(e) => processFiles(e.target.files)}
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-gray-300'}`} />
                  <p className="font-semibold text-gray-600">
                    {sheets.length > 0 ? 'Drop more files to add them' : 'Drop your QuickBooks .xlsx exports here'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Journal, Trial Balance, Customers, Vendors, Employees -- drop all at once
                  </p>
                </div>

                {/* How-to hint */}
                {sheets.length === 0 && (
                  <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Exporting from QuickBooks</p>
                      <p className="text-blue-700">
                        Reports, open each report, then Export to Excel.
                        For transactions use the <strong>Journal</strong> report.
                        For accounts and balances use <strong>Trial Balance</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detected sheets */}
            {sheets.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detected Files & Sheets</CardTitle>
                  <CardDescription>Toggle off anything you don't want to import.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {sheets.map((sheet, idx) => {
                      const meta = TYPE_META[sheet.type] || TYPE_META[TYPES.UNKNOWN];
                      const Icon = meta.Icon;
                      return (
                        <div key={idx} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                          sheet.selected ? 'bg-white' : 'bg-gray-50 opacity-50'
                        }`}>
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSheet(idx)}
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              sheet.selected
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {sheet.selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>

                          <Icon className={`w-4 h-4 text-${meta.color}-500 flex-shrink-0`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-800 truncate">{sheet.sheetName}</span>
                              <Badge className={`text-xs bg-${meta.color}-100 text-${meta.color}-700 flex-shrink-0`}>
                                {meta.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{sheet.fileName}</p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold text-gray-700">{sheet.count.toLocaleString()}</span>
                            <p className="text-xs text-gray-400">records</p>
                          </div>

                          <button
                            onClick={() => removeSheet(idx)}
                            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {sheets.length > 0 && !hasJournal && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  No Journal file detected. Transactions won't be imported -- add your QuickBooks Journal export to include them.
                </p>
              </div>
            )}
            {sheets.length > 0 && !hasTB && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  No Trial Balance detected. Chart of accounts and opening balances won't be imported -- add your Trial Balance export.
                </p>
              </div>
            )}

            {/* Action */}
            {selectedSheets.length > 0 && (
              <Button
                onClick={startImport}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Import{totalAccounts > 0 ? ` ${totalAccounts} accounts` : ''}
                {totalAccounts > 0 && totalTx > 0 ? ' + ' : ''}
                {totalTx > 0 ? ` ${totalTx.toLocaleString()} transactions` : ''}
                {totalAccounts === 0 && totalTx === 0 ? ` ${selectedSheets.length} file${selectedSheets.length !== 1 ? 's' : ''}` : ''}
              </Button>
            )}
          </div>
        )}

        {/* ?? Step 3: Importing ???????????????????????????????????????????? */}
        {step === 3 && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                Importing?
              </CardTitle>
              <CardDescription>Keep this tab open. Large journals may take a few minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="h-2.5" />
              <p className="text-xs text-right text-gray-400">{progress}%</p>
              <div className="bg-gray-950 rounded-xl p-4 max-h-72 overflow-y-auto font-mono text-xs space-y-1">
                {logs.length === 0 && <p className="text-gray-500">Starting?</p>}
                {logs.map((l, i) => (
                  <p key={i} className={
                    l.type === 'success' ? 'text-emerald-400' :
                    l.type === 'warn'    ? 'text-yellow-400' :
                    l.type === 'error'   ? 'text-red-400' : 'text-gray-400'
                  }>{l.msg}</p>
                ))}
                <div ref={logEndRef} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ?? Step 4: Done ????????????????????????????????????????????????? */}
        {step === 4 && result && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardContent className="pt-10 pb-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 ring-8 ring-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import Complete</h2>
                <p className="text-sm text-gray-400 mt-1">{currentBusiness?.display_name}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
                {[
                  { label: 'Accounts',     value: result.accounts,     color: 'violet' },
                  { label: 'Clients',      value: result.clients,      color: 'green'  },
                  { label: 'Vendors',      value: result.vendors,      color: 'orange' },
                  { label: 'Employees',    value: result.employees,    color: 'pink'   },
                  { label: 'Transactions', value: result.transactions, color: 'amber'  },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-4 bg-${color}-50 border border-${color}-100`}>
                    <p className={`text-2xl font-bold text-${color}-600`}>{value.toLocaleString()}</p>
                    <p className={`text-xs text-${color}-700 mt-1`}>{label}</p>
                  </div>
                ))}
              </div>

              {result.failed > 0 && (
                <p className="text-sm text-red-500">{result.failed} transactions failed -- check the log below</p>
              )}

              {logs.length > 0 && (
                <details className="text-left max-w-lg mx-auto">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                    Show full import log
                  </summary>
                  <div className="mt-3 bg-gray-950 rounded-xl p-4 max-h-56 overflow-y-auto font-mono text-xs space-y-1">
                    {logs.map((l, i) => (
                      <p key={i} className={
                        l.type === 'success' ? 'text-emerald-400' :
                        l.type === 'warn'    ? 'text-yellow-400' :
                        l.type === 'error'   ? 'text-red-400' : 'text-gray-400'
                      }>{l.msg}</p>
                    ))}
                  </div>
                </details>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left max-w-lg mx-auto">
                <p className="font-semibold mb-1">Recommended next steps</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Review <strong>Chart of Accounts</strong> -- check auto-classified types</li>
                  <li>Open <strong>Contractors</strong> -- add tax IDs for any W-9 vendors</li>
                  <li>Check <strong>Transactions</strong> for any uncategorized entries</li>
                  <li>Run <strong>Reports &gt; Trial Balance</strong> to verify totals match QB</li>
                </ol>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-2" />Import More Files
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => window.location.href = '/dashboard'}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Imports() {
  return (
    <RequireBusinessAccess requiredPermission="admin">
      <ImportsContent />
    </RequireBusinessAccess>
  );
}