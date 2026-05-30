import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createDefaultAccounts } from '../components/accounts/defaultAccounts';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { useBusiness } from '../contexts/BusinessContext';



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

export default function BusinessSetup() {
  const navigate = useNavigate();
  const { refreshBusinesses } = useBusiness(); //to allow new businesses to populate
  const [formData, setFormData] = useState({
    legal_name: '',
    display_name: '',
    ein: '',
    accounting_method: 'cash',
    fiscal_year_start_month: 1,
    fiscal_year_end_month: 12,
    address: '',
    phone: '',
    email: ''
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Only send columns that exist in the businesses table
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert([{
          legal_name: data.legal_name,
          display_name: data.display_name,
          ein: data.ein || null,
          accounting_method: data.accounting_method,
          fiscal_year_start_month: data.fiscal_year_start_month,
          fiscal_year_end_month: data.fiscal_year_end_month,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          status: 'active',
          owner_id: user.id,   // businesses table has owner_id not created_by
        }])
        .select()
        .single();
      if (bizError) throw bizError;

      // Create admin access — only columns that exist in user_business_access
      const { error: accessError } = await supabase
        .from('user_business_access')
        .insert([{
          user_id: user.id,
          user_email: user.email,
          business_id: business.id,
          permission_level: 'admin',
          is_default: true,
        }]);
      if (accessError) throw accessError;

      // Seed default chart of accounts
      await createDefaultAccounts(business.id);

      return business;
    },
    onSuccess: async (business) => {
      localStorage.setItem('currentBusinessId', business.id);
      await refreshBusinesses();
      navigate('/dashboard');
    },
// Bandaid logic incase new fix doesn't work
//     onSuccess: (business) => {
//   localStorage.setItem('currentBusinessId', business.id);
//   // Small delay to let Supabase propagate the new rows before context re-fetches
//   setTimeout(() => navigate('/dashboard'), 500);
// },
   
    onError: (error) => {
      console.error('Business creation failed:', error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.legal_name || !formData.display_name) return;
    createBusinessMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Business</h1>
          <p className="text-gray-500">Set up your business profile to start managing your accounting</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Business Information</CardTitle>
            <CardDescription>Enter your business details below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="legal_name" className="text-sm font-medium">
                    Legal Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => handleChange('legal_name', e.target.value)}
                    placeholder="Acme Corporation Inc."
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="display_name" className="text-sm font-medium">
                    Display Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    placeholder="Acme Corp"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Short name shown in the app</p>
                </div>

                <div>
                  <Label htmlFor="ein" className="text-sm font-medium">EIN (Optional)</Label>
                  <Input
                    id="ein"
                    value={formData.ein}
                    onChange={(e) => handleChange('ein', e.target.value)}
                    placeholder="XX-XXXXXXX"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Accounting Method</Label>
                  <Select
                    value={formData.accounting_method}
                    onValueChange={(value) => handleChange('accounting_method', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Basis</SelectItem>
                      <SelectItem value="accrual">Accrual Basis</SelectItem>
                      {/* <SelectItem value="both">Both Methods</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Fiscal Year Start</Label>
                  <Select
                    value={formData.fiscal_year_start_month.toString()}
                    onValueChange={(value) => handleChange('fiscal_year_start_month', parseInt(value))}
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
                  <Label htmlFor="email" className="text-sm font-medium">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@acme.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Business Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1.5"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-medium">Business Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Business St, Suite 100, City, State ZIP"
                    className="mt-1.5 h-20"
                  />
                </div>
              </div>

              {createBusinessMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  Failed to create business: {createBusinessMutation.error?.message || 'Unknown error'}
                </div>
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base"
                  disabled={createBusinessMutation.isPending}
                >
                  {createBusinessMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Business...
                    </>
                  ) : (
                    <>
                      Create Business
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}