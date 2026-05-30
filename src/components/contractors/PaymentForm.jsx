import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';

export default function PaymentForm({ open, onClose, onSubmit, contractor }) {
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: contractor?.payment_method || 'check',
    check_number: '',
    bank_account_id: '',
    expense_account_id: '',
    project_tag_id: '',
    memo: ''
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({ business_id: currentBusiness.id }),
    enabled: !!currentBusiness
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', currentBusiness?.id],
    queryFn: () => base44.entities.Tag.filter({ business_id: currentBusiness.id }),
    enabled: !!currentBusiness
  });

  const bankAccounts = accounts.filter(a => 
    a.is_active && a.type === 'asset' && 
    (a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('checking') || a.name.toLowerCase().includes('cash'))
  );

  const expenseAccounts = accounts.filter(a => a.is_active && a.type === 'expense');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!contractor?.w9_collected) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Missing W-9 Form</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              This contractor does not have a W-9 form on file. Please collect their W-9 before making payments to ensure you can properly report payments to the IRS.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay {contractor?.full_legal_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Who did you pay?</p>
            <p className="font-medium">{contractor?.full_legal_name}</p>
            {contractor?.business_name && (
              <p className="text-sm text-gray-500">{contractor.business_name}</p>
            )}
          </div>

          <div>
            <Label>Payment Date *</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-9"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <Label>Payment Method *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="ach">ACH Transfer</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_method === 'check' && (
            <div>
              <Label>Check Number</Label>
              <Input
                value={formData.check_number}
                onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                placeholder="1001"
              />
            </div>
          )}

          <div>
            <Label>Bank Account *</Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Expense Category *</Label>
            <Select
              value={formData.expense_account_id}
              onValueChange={(value) => setFormData({ ...formData, expense_account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tags.length > 0 && (
            <div>
              <Label>Project Tag (optional)</Label>
              <Select
                value={formData.project_tag_id}
                onValueChange={(value) => setFormData({ ...formData, project_tag_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No tag</SelectItem>
                  {tags.filter(t => t.category === 'project').map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Memo</Label>
            <Textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="What was this payment for?"
              rows={2}
            />
          </div>

          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              This will record the payment in your books. Contractors handle their own taxes - no withholding required.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
