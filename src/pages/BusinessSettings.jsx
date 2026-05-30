//src\pages\Businesssettings.jsx
import React, { useState } from 'react';
// base44 removed
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Save, 
  Loader2,
  Archive,
  Building2,
  AlertTriangle,
  XCircle,
  Lock
} from 'lucide-react';
import { Term } from '@/components/accounting/AccountingTooltip';
import PeriodLockManager from '@/components/period-lock/PeriodLockManager';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function BusinessSettingsContent() {
  const { currentBusiness, canAdmin, canEdit, refreshBusinesses } = useBusiness();
  const queryClient = useQueryClient();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [formData, setFormData] = useState({
    legal_name: currentBusiness?.legal_name || '',
    display_name: currentBusiness?.display_name || '',
    base_currency: currentBusiness?.base_currency || 'USD',
    ein: currentBusiness?.ein || '',
    accounting_method: currentBusiness?.accounting_method || 'cash',
    fiscal_year_start_month: currentBusiness?.fiscal_year_start_month || 1,
    fiscal_year_end_month: currentBusiness?.fiscal_year_end_month || 12,
    address: currentBusiness?.address || '',
    phone: currentBusiness?.phone || '',
    email: currentBusiness?.email || ''
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Business.update(currentBusiness.id, data),
    onSuccess: () => {
      refreshBusinesses();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Business.update(currentBusiness.id, { status: 'archived' }),
    onSuccess: () => {
      refreshBusinesses();
      setShowArchiveDialog(false);
    }
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Business.update(currentBusiness.id, { 
        status: 'closed',
        closed_date: new Date().toISOString().split('T')[0],
        closed_by: user.email
      });
    },
    onSuccess: () => {
      refreshBusinesses();
      setShowCloseDialog(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      return base44.entities.Business.update(currentBusiness.id, { 
        status: 'deleted',
        deleted_date: new Date().toISOString().split('T')[0],
        deleted_by: user.email,
        permanent_deletion_date: thirtyDaysFromNow.toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      refreshBusinesses();
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
      // Redirect to dashboard or business setup
      window.location.href = '/';
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const isEditable = canEdit();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            Business Settings
          </h1>
          <p className="text-gray-500 mt-1">
            Manage settings for {currentBusiness.display_name}
          </p>
        </div>

        <form onSubmit={handleSave}>
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                Business Information
              </CardTitle>
              <CardDescription>
                Update your business details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="legal_name">Legal Business Name</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => handleChange('legal_name', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>

                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>

                <div>
                  <Label htmlFor="ein">EIN</Label>
                  <Input
                    id="ein"
                    value={formData.ein}
                    onChange={(e) => handleChange('ein', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>

                <div>
                  <Label>
                    <Term term="base_currency">Base Currency</Term>
                  </Label>
                  <Select
                    value={formData.base_currency}
                    onValueChange={(value) => handleChange('base_currency', value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">All reports will display in this currency</p>
                </div>

                <div>
                  <Label>
                    Accounting Method
                  </Label>
                  <Select
                    value={formData.accounting_method}
                    onValueChange={(value) => handleChange('accounting_method', value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Basis</SelectItem>
                      <SelectItem value="accrual">Accrual Basis</SelectItem>
                      <SelectItem value="both">Both Methods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    <Term term="fiscal_year">Fiscal Year</Term> Start
                  </Label>
                  <Select
                    value={formData.fiscal_year_start_month.toString()}
                    onValueChange={(value) => handleChange('fiscal_year_start_month', parseInt(value))}
                    disabled={!isEditable}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(month => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Business Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="mt-1.5"
                    disabled={!isEditable}
                  />
                </div>
              </div>

              {isEditable && (
                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        {/* Period Locking */}
        {canAdmin() && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-400" />
                Period Locking
              </CardTitle>
              <CardDescription>
                Lock accounting periods to prevent changes to finalized books
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeriodLockManager />
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Admin Only */}
        {canAdmin() && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                These actions affect business operations. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Close Business */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-600" />
                    Close Business
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Mark this business as closed. All data remains accessible (read-only), 
                    but no new transactions can be added. Can be reopened later.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 ml-4"
                  onClick={() => setShowCloseDialog(true)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>

              {/* Delete Business */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Delete Business
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Permanently delete this business after 30-day grace period. 
                    This will remove all transactions, accounts, and documents. Cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-red-300 text-red-600 hover:bg-red-100 ml-4"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Close Business Dialog */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-yellow-700">
                <Lock className="w-5 h-5" />
                Close Business
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to close <strong>{currentBusiness.display_name}</strong>?</p>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm space-y-1">
                  <p className="font-medium text-yellow-900">What happens when you close:</p>
                  <ul className="list-disc list-inside text-yellow-800 space-y-1">
                    <li>All data remains accessible (read-only)</li>
                    <li>Cannot add new transactions</li>
                    <li>Can still run historical reports</li>
                    <li>Can be reopened by an admin if needed</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-yellow-600 hover:bg-yellow-700"
                onClick={() => closeMutation.mutate()}
              >
                {closeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Close Business'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Business Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Delete Business - Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="text-red-700 font-medium">
                  This will permanently delete <strong>{currentBusiness.display_name}</strong> and all associated data.
                </p>
                <div className="bg-red-50 p-3 rounded border border-red-200 text-sm space-y-2">
                  <p className="font-medium text-red-900">What will be deleted:</p>
                  <ul className="list-disc list-inside text-red-800 space-y-1">
                    <li>All transactions and journal entries</li>
                    <li>Chart of accounts</li>
                    <li>All documents and receipts</li>
                    <li>All reports and historical data</li>
                    <li>All user access to this business</li>
                  </ul>
                  <p className="font-medium text-red-900 mt-2">Grace period:</p>
                  <p className="text-red-800">
                    The business will be hidden immediately but can be restored by an admin 
                    within 30 days. After 30 days, deletion is permanent.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirm-delete" className="text-sm font-medium">
                    Type the business name to confirm: <span className="font-bold">{currentBusiness.display_name}</span>
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Enter business name"
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirmText !== currentBusiness.display_name || deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete Permanently'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function BusinessSettings() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <BusinessSettingsContent />
    </RequireBusinessAccess>
  );
}
