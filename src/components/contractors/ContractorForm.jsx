import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ContractorForm({ open, onClose, onSubmit, contractor }) {
  const [formData, setFormData] = useState(contractor || {
    full_legal_name: '',
    business_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    tax_id: '',
    tax_id_type: 'ssn',
    w9_collected: false,
    w9_date: '',
    payment_method: 'check',
    email: '',
    phone: '',
    is_active: true,
    notes: ''
  });

  const [showTaxId, setShowTaxId] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatTaxId = (value, type) => {
    const cleaned = value.replace(/\D/g, '');
    if (type === 'ssn') {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
    } else {
      if (cleaned.length <= 2) return cleaned;
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contractor ? 'Edit Contractor' : 'Add New Contractor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              For contractors and freelancers only. Not for W-2 employees.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full Legal Name *</Label>
              <Input
                value={formData.full_legal_name}
                onChange={(e) => setFormData({ ...formData, full_legal_name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="col-span-2">
              <Label>Business Name (if applicable)</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Smith Consulting LLC"
              />
            </div>

            <div className="col-span-2">
              <Label>Street Address *</Label>
              <Input
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="123 Main St"
                required
              />
            </div>

            <div className="col-span-2">
              <Label>Apartment, suite, etc.</Label>
              <Input
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apt 4B"
              />
            </div>

            <div>
              <Label>City *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>State *</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="CA"
                required
              />
            </div>

            <div>
              <Label>ZIP Code *</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Tax ID Type *</Label>
              <Select
                value={formData.tax_id_type}
                onValueChange={(value) => setFormData({ ...formData, tax_id_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssn">SSN</SelectItem>
                  <SelectItem value="ein">EIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>{formData.tax_id_type === 'ssn' ? 'Social Security Number' : 'Employer ID Number'} *</Label>
              <div className="flex gap-2">
                <Input
                  type={showTaxId ? 'text' : 'password'}
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tax_id: formatTaxId(e.target.value, formData.tax_id_type)
                  })}
                  placeholder={formData.tax_id_type === 'ssn' ? '***-**-****' : '**-*******'}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTaxId(!showTaxId)}
                >
                  {showTaxId ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            <div className="col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="w9"
                  checked={formData.w9_collected}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    w9_collected: checked,
                    w9_date: checked ? new Date().toISOString().split('T')[0] : ''
                  })}
                />
                <Label htmlFor="w9">W-9 form collected</Label>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active contractor</Label>
              </div>
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {contractor ? 'Save Changes' : 'Add Contractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
