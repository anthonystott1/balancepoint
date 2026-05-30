import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Contractor1099Dashboard({ contractors, payments, year }) {
  const getContractorYTD = (contractorId) => {
    return payments
      .filter(p => {
        const paymentYear = new Date(p.payment_date).getFullYear();
        return p.contractor_id === contractorId && 
               paymentYear === year &&
               !p.is_deleted;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const contractorData = contractors
    .filter(c => c.is_active || getContractorYTD(c.id) > 0)
    .map(c => ({
      ...c,
      ytd_total: getContractorYTD(c.id),
      needs_1099: getContractorYTD(c.id) >= 600
    }))
    .sort((a, b) => b.ytd_total - a.ytd_total);

  const total1099Count = contractorData.filter(c => c.needs_1099).length;
  const totalPaid = contractorData.reduce((sum, c) => sum + c.ytd_total, 0);
  const missingW9 = contractorData.filter(c => c.needs_1099 && !c.w9_collected);

  const exportToCSV = () => {
    const csvData = contractorData
      .filter(c => c.needs_1099)
      .map(c => ({
        'Legal Name': c.full_legal_name,
        'Business Name': c.business_name || '',
        'Address': c.address_line1,
        'Address Line 2': c.address_line2 || '',
        'City': c.city,
        'State': c.state,
        'ZIP': c.zip_code,
        'Tax ID Type': c.tax_id_type.toUpperCase(),
        'Tax ID': c.tax_id,
        'Total Paid': c.ytd_total.toFixed(2),
        'W-9 Collected': c.w9_collected ? 'Yes' : 'No'
      }));

    const headers = Object.keys(csvData[0]);
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1099-NEC-${year}.csv`;
    a.click();
  };

  const generatePDF = async (contractor) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Form 1099-NEC', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Nonemployee Compensation - ${year}`, 105, 28, { align: 'center' });
    
    // Contractor info
    doc.setFontSize(10);
    doc.text('RECIPIENT:', 20, 50);
    doc.text(contractor.full_legal_name, 20, 58);
    if (contractor.business_name) {
      doc.text(contractor.business_name, 20, 64);
    }
    doc.text(contractor.address_line1, 20, 70);
    if (contractor.address_line2) {
      doc.text(contractor.address_line2, 20, 76);
    }
    doc.text(`${contractor.city}, ${contractor.state} ${contractor.zip_code}`, 20, 82);
    
    // Tax ID
    doc.text(`Tax ID (${contractor.tax_id_type.toUpperCase()}): ${contractor.tax_id}`, 20, 94);
    
    // Amount
    doc.setFontSize(12);
    doc.text('Box 1 - Nonemployee Compensation:', 20, 110);
    doc.setFontSize(14);
    doc.text(`$${contractor.ytd_total.toFixed(2)}`, 100, 110);
    
    // Footer
    doc.setFontSize(8);
    doc.text('This is a draft form for your records. Official 1099-NEC forms must be filed with the IRS.', 105, 280, { align: 'center' });
    
    doc.save(`1099-NEC-${year}-${contractor.full_legal_name.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Paid to Contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">1099s Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total1099Count}</div>
            <p className="text-xs text-gray-500 mt-1">Contractors paid $600+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Missing W-9s</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{missingW9.length}</div>
            {missingW9.length > 0 && (
              <p className="text-xs text-red-600 mt-1">Action required</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {missingW9.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {missingW9.length} contractor{missingW9.length > 1 ? 's' : ''} paid over $600 {missingW9.length > 1 ? 'are' : 'is'} missing W-9 forms. Collect W-9s before filing 1099s.
          </AlertDescription>
        </Alert>
      )}

      {/* Export Actions */}
      <div className="flex gap-3">
        <Button onClick={exportToCSV} disabled={total1099Count === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Contractor List */}
      <Card>
        <CardHeader>
          <CardTitle>{year} Contractor Payments</CardTitle>
          <CardDescription>
            All contractors you paid this year. 1099-NEC required for payments $600 or more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contractorData.map(contractor => (
              <div key={contractor.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{contractor.full_legal_name}</h3>
                      {contractor.needs_1099 && (
                        <Badge variant={contractor.w9_collected ? 'default' : 'destructive'}>
                          1099 Required
                        </Badge>
                      )}
                      {contractor.w9_collected ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          W-9 On File
                        </Badge>
                      ) : contractor.needs_1099 && (
                        <Badge variant="outline" className="text-red-600">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          W-9 Missing
                        </Badge>
                      )}
                    </div>

                    {contractor.business_name && (
                      <p className="text-sm text-gray-600">{contractor.business_name}</p>
                    )}

                    <p className="text-sm text-gray-500 mt-1">
                      {contractor.address_line1}, {contractor.city}, {contractor.state} {contractor.zip_code}
                    </p>

                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        You paid <span className="font-semibold">{contractor.full_legal_name}</span>
                        {' '}<span className="text-lg font-bold text-indigo-600">
                          ${contractor.ytd_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span> this year
                      </p>
                    </div>
                  </div>

                  {contractor.needs_1099 && contractor.w9_collected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePDF(contractor)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Generate 1099
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {contractorData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No contractor payments in {year}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
