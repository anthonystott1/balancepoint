import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

export default function DataIntegrityChecker() {
  const { currentBusiness, canAdmin } = useBusiness();
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState(null);

  const runIntegrityCheck = async () => {
    setIsChecking(true);
    const issues = [];

    try {
      // Check 1: Transactions balance
      const transactions = await base44.entities.Transaction.filter({
        business_id: currentBusiness.id,
        is_deleted: false
      });
      
      const lines = await base44.entities.TransactionLine.filter({
        business_id: currentBusiness.id
      });

      for (const txn of transactions) {
        const txnLines = lines.filter(l => l.transaction_id === txn.id);
        const totalDebits = txnLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
        const totalCredits = txnLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          issues.push({
            type: 'unbalanced_transaction',
            severity: 'high',
            message: `Transaction "${txn.description}" (${txn.id.slice(0, 8)}) is unbalanced: Debits $${totalDebits.toFixed(2)}, Credits $${totalCredits.toFixed(2)}`,
            entity: 'Transaction',
            entityId: txn.id
          });
        }
      }

      // Check 2: Orphaned transaction lines
      const transactionIds = new Set(transactions.map(t => t.id));
      const orphanedLines = lines.filter(l => !transactionIds.has(l.transaction_id));
      
      if (orphanedLines.length > 0) {
        issues.push({
          type: 'orphaned_lines',
          severity: 'medium',
          message: `Found ${orphanedLines.length} transaction lines without valid transactions`,
          entity: 'TransactionLine',
          count: orphanedLines.length
        });
      }

      // Check 3: Invalid account references
      const accounts = await base44.entities.Account.filter({
        business_id: currentBusiness.id
      });
      const accountIds = new Set(accounts.map(a => a.id));
      
      const invalidLines = lines.filter(l => !accountIds.has(l.account_id));
      
      if (invalidLines.length > 0) {
        issues.push({
          type: 'invalid_accounts',
          severity: 'high',
          message: `Found ${invalidLines.length} transaction lines referencing deleted or invalid accounts`,
          entity: 'TransactionLine',
          count: invalidLines.length
        });
      }

      // Check 4: Duplicate transaction tags
      const txnTags = await base44.entities.TransactionTag.filter({
        business_id: currentBusiness.id
      });
      
      const tagKeys = {};
      let duplicates = 0;
      
      txnTags.forEach(tag => {
        const key = `${tag.transaction_id}-${tag.tag_id}`;
        if (tagKeys[key]) {
          duplicates++;
        }
        tagKeys[key] = true;
      });
      
      if (duplicates > 0) {
        issues.push({
          type: 'duplicate_tags',
          severity: 'low',
          message: `Found ${duplicates} duplicate transaction tags`,
          entity: 'TransactionTag',
          count: duplicates
        });
      }

      setResults({
        timestamp: new Date().toISOString(),
        totalIssues: issues.length,
        issues
      });
    } catch (error) {
      setResults({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (!canAdmin()) return null;

  const severityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Data Integrity Check</CardTitle>
          </div>
          <Button
            onClick={runIntegrityCheck}
            disabled={isChecking}
            size="sm"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Check
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!results && (
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              Run an integrity check to validate your data and identify potential issues.
            </AlertDescription>
          </Alert>
        )}

        {results && !results.error && (
          <div className="space-y-4">
            {results.totalIssues === 0 ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All checks passed! Your data is healthy.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Found {results.totalIssues} issue{results.totalIssues !== 1 ? 's' : ''} that need attention.
                </AlertDescription>
              </Alert>
            )}

            {results.issues.length > 0 && (
              <div className="space-y-2">
                {results.issues.map((issue, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Badge className={severityColors[issue.severity]}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{issue.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Entity: {issue.entity}
                          {issue.entityId && ` • ID: ${issue.entityId.slice(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Last checked: {new Date(results.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {results && results.error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Error running integrity check: {results.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
