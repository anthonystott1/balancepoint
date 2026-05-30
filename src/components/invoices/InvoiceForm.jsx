import React, { useState, useEffect } from 'react';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Info } from 'lucide-react';

export default function InvoiceForm({ invoice, isOpen, onClose, onSubmit, isSubmitting }) {
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'Net 30',
    line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    discount_amount: 0,
    discount_percent: 0,
    notes: '',
    internal_notes: '',
    project_tag_id: '',
    income_account_id: '',
    status: 'draft'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentBusiness?.id],
    queryFn: () => base44.entities.Client.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness?.id && isOpen
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true,
      type: 'income'
    }),
    enabled: !!currentBusiness?.id && isOpen
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', currentBusiness?.id],
    queryFn: () => base44.entities.Tag.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness?.id && isOpen
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        client_id: invoice.client_id || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date || '',
        payment_terms: invoice.payment_terms || 'Net 30',
        line_items: invoice.line_items || [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        discount_amount: invoice.discount_amount || 0,
        discount_percent: invoice.discount_percent || 0,
        notes: invoice.notes || '',
        internal_notes: invoice.internal_notes || '',
        project_tag_id: invoice.project_tag_id || '',
        income_account_id: invoice.income_account_id || '',
        status: invoice.status || 'draft'
      });
    }
  }, [invoice]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index][field] = value;
    
    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : newLineItems[index].quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : newLineItems[index].rate;
      newLineItems[index].amount = qty * rate;
    }
    
    setFormData(prev => ({ ...prev, line_items: newLineItems }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals
  const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountAmount = formData.discount_percent > 0 
    ? subtotal * (formData.discount_percent / 100)
    : parseFloat(formData.discount_amount) || 0;
  const total = subtotal - discountAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      subtotal,
      discount_amount: formData.discount_percent > 0 ? 0 : discountAmount,
      discount_percent: formData.discount_percent,
      total_amount: total,
      balance_due: total - (invoice?.amount_paid || 0)
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create an invoice
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Client <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="invoice_number">
                Invoice Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => handleChange('invoice_number', e.target.value)}
                placeholder="INV-001"
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoice_date">
                Invoice Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => handleChange('invoice_date', e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="due_date">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => handleChange('payment_terms', e.target.value)}
                placeholder="Net 30"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Line Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Amount"
                        value={formatCurrency(item.amount)}
                        disabled
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {formData.line_items.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Totals */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="discount_amount">Discount Amount</Label>
                    <Input
                      id="discount_amount"
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => handleChange('discount_amount', e.target.value)}
                      disabled={formData.discount_percent > 0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_percent">Discount %</Label>
                    <Input
                      id="discount_percent"
                      type="number"
                      step="0.01"
                      value={formData.discount_percent}
                      onChange={(e) => handleChange('discount_percent', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-indigo-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Income Account</Label>
              <Select
                value={formData.income_account_id}
                onValueChange={(value) => handleChange('income_account_id', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Used when creating payment transaction</p>
            </div>

            <div>
              <Label>Project Tag (Optional)</Label>
              <Select
                value={formData.project_tag_id}
                onValueChange={(value) => handleChange('project_tag_id', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No tag</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (visible to client)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Thank you for your business!"
              className="mt-1.5 h-20"
            />
          </div>

          <div>
            <Label htmlFor="internal_notes">Internal Notes (not shown to client)</Label>
            <Textarea
              id="internal_notes"
              value={formData.internal_notes}
              onChange={(e) => handleChange('internal_notes', e.target.value)}
              placeholder="Internal notes..."
              className="mt-1.5 h-20"
            />
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
                invoice ? 'Update Invoice' : 'Create Invoice'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
