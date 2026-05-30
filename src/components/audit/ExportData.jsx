import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Database } from 'lucide-react';

export default function ExportData() {
  const { currentBusiness, canAdmin } = useBusiness();
  const [isExporting, setIsExporting] = useState(false);

  const exportFullBackup = async () => {
    setIsExporting(true);

    try {
      // Fetch all data
      const [transactions, accounts, transactionLines, tags, contractors, invoices, loans, receipts] = await Promise.all([
        base44.entities.Transaction.filter({ business_id: currentBusiness.id }),
        base44.entities.Account.filter({ business_id: currentBusiness.id }),
        base44.entities.TransactionLine.filter({ business_id: currentBusiness.id }),
        base44.entities.Tag.filter({ business_id: currentBusiness.id }),
        base44.entities.Contractor.filter({ business_id: currentBusiness.id }),
        base44.entities.Invoice.filter({ business_id: currentBusiness.id }),
        base44.entities.Loan.filter({ business_id: currentBusiness.id }),
        base44.entities.Receipt.filter({ business_id: currentBusiness.id })
      ]);

      const backup = {
        business: currentBusiness,
        exportDate: new Date().toISOString(),
        data: {
          transactions,
          accounts,
          transactionLines,
          tags,
          contractors,
          invoices,
          loans,
          receipts
        }
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentBusiness.display_name}-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!canAdmin()) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Export & Backup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Export a complete backup of all your business data including transactions, accounts, contractors, invoices, and more.
        </p>
        <Button onClick={exportFullBackup} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Full Backup
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
