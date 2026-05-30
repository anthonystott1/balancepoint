import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function ReconciliationView({ 
  account, 
  transactions, 
  transactionLines,
  onToggleCleared,
  canEdit 
}) {
  const [bankBalance, setBankBalance] = useState('');

  // Get transactions for this account with running balance
  const accountTransactions = useMemo(() => {
    const lines = transactionLines.filter(l => l.account_id === account.id);
    const txnIds = [...new Set(lines.map(l => l.transaction_id))];
    const relevantTxns = transactions.filter(t => txnIds.includes(t.id));

    // Calculate running balance
    let runningBalance = 0;
    return relevantTxns
      .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date))
      .map(txn => {
        const line = lines.find(l => l.transaction_id === txn.id);
        const change = (line.debit_amount || 0) - (line.credit_amount || 0);
        runningBalance += change;

        return {
          ...txn,
          change,
          runningBalance
        };
      });
  }, [account.id, transactions, transactionLines]);

  const clearedBalance = accountTransactions
    .filter(t => t.is_cleared)
    .reduce((sum, t) => sum + t.change, 0);

  const unclearedBalance = accountTransactions
    .filter(t => !t.is_cleared)
    .reduce((sum, t) => sum + t.change, 0);

  const bookBalance = clearedBalance + unclearedBalance;
  const bankBalanceNum = parseFloat(bankBalance) || 0;
  const discrepancy = Math.abs(bankBalanceNum - clearedBalance);

  return (
    <div className="space-y-6">
      {/* Reconciliation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Book Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              ${bookBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Cleared Balance</p>
            <p className="text-2xl font-bold text-green-600">
              ${clearedBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Uncleared</p>
            <p className="text-2xl font-bold text-orange-600">
              ${unclearedBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Bank Statement Balance</p>
            <Input
              type="number"
              step="0.01"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              placeholder="Enter amount"
              className="text-lg font-bold h-auto p-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy Alert */}
      {bankBalance && discrepancy > 0.01 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Discrepancy Detected</p>
              <p className="text-sm text-red-700">
                There's a ${discrepancy.toFixed(2)} difference between your cleared balance 
                and the bank statement. Review uncleared transactions below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {bankBalance && discrepancy <= 0.01 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Reconciled!</p>
              <p className="text-sm text-green-700">
                Your cleared balance matches the bank statement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cleared
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accountTransactions.map(txn => (
                  <tr key={txn.id} className={`hover:bg-gray-50 ${!txn.is_cleared ? 'bg-orange-50' : ''}`}>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <Checkbox
                          checked={txn.is_cleared}
                          onCheckedChange={() => onToggleCleared(txn)}
                        />
                      ) : (
                        txn.is_cleared ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(txn.transaction_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{txn.description}</p>
                        {txn.reference_number && (
                          <p className="text-xs text-gray-500">Ref: {txn.reference_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        txn.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.change > 0 ? '+' : ''}{txn.change.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      ${txn.runningBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
