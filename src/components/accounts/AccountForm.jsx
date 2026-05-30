import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Info } from 'lucide-react';
import AccountTypeIcon from './AccountTypeIcon';

const ACCOUNT_TYPE_INFO = {
  asset: {
    label: "Assets",
    description: "Assets are resources your business owns that have value",
    examples: "Cash, equipment, inventory, accounts receivable"
  },
  liability: {
    label: "Liabilities",
    description: "Liabilities are debts or obligations your business needs to pay",
    examples: "Accounts payable, loans, credit cards, accrued expenses"
  },
  equity: {
    label: "Equity",
    description: "Equity represents the owner's stake in the business",
    examples: "Owner's capital, retained earnings, dividends"
  },
  income: {
    label: "Revenue",
    description: "Revenue is money your business earns from its activities",
    examples: "Sales revenue, service fees, interest income"
  },
  expense: {
    label: "Expenses",
    description: "Expenses are costs incurred to run your business",
    examples: "Rent, utilities, salaries, supplies, advertising"
  }
};

export default function AccountForm({ 
  account, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting,
  accounts = []
}) {
  const [formData, setFormData] = useState(account || {
    account_number: '',
    name: '',
    type: 'expense',
    parent_account_id: '',
    description: ''
  });

  const [selectedType, setSelectedType] = useState(formData.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'type') {
      setSelectedType(value);
      // Clear parent when type changes
      setFormData(prev => ({ ...prev, parent_account_id: '' }));
    }
  };

  // Filter accounts by selected type for parent selection
  const availableParentAccounts = accounts.filter(acc => 
    acc.type === selectedType && acc.id !== account?.id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Edit Account' : 'Create New Account'}
          </DialogTitle>
          <DialogDescription>
            {account 
              ? 'Update the account details below' 
              : 'Add a new account to your chart of accounts'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="account_number">
                Account Number (Optional)
              </Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => handleChange('account_number', e.target.value)}
                placeholder="e.g., 6000"
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                A reference number for organization
              </p>
            </div>

            <div>
              <Label htmlFor="name">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Office Rent"
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div>
            <Label>
              Account Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-3">
                      <AccountTypeIcon type={key} className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{info.label}</p>
                        <p className="text-xs text-gray-500">{info.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedType && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {ACCOUNT_TYPE_INFO[selectedType].label}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Examples: {ACCOUNT_TYPE_INFO[selectedType].examples}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {availableParentAccounts.length > 0 && (
            <div>
              <Label>
                Parent Account (Optional)
              </Label>
              <Select
                value={formData.parent_account_id || 'none'}
                onValueChange={(value) => handleChange('parent_account_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level account)</SelectItem>
                  {availableParentAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Make this a sub-account under another account for better organization
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Explain what this account is used for in plain language..."
              className="mt-1.5 h-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Help yourself and your team understand when to use this account
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                account ? 'Update Account' : 'Create Account'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
