import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Repeat } from 'lucide-react';
import TagSelector from '../tags/TagSelector';
import { calculateNextOccurrence, getUpcomingOccurrences } from './recurringUtils';
import { format } from 'date-fns';

export default function RecurringTransactionWizard({ open, onClose, template }) {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [formData, setFormData] = useState(template || {
    template_name: '',
    description: '',
    frequency: 'monthly',
    day_of_month: 1,
    day_of_week: 1,
    month_of_year: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_occurrences: '',
    from_account_id: '',
    to_account_id: '',
    amount: '',
    tag_ids: [],
    is_active: true,
    skip_weekends: false,
    require_review: false
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const nextOccurrence = calculateNextOccurrence(
        { ...data, start_date: data.start_date },
        new Date(data.start_date)
      );

      const templateData = {
        ...data,
        business_id: currentBusiness.id,
        next_occurrence_date: nextOccurrence.toISOString().split('T')[0],
        occurrences_generated: template?.occurrences_generated || 0,
        max_occurrences: data.max_occurrences ? parseInt(data.max_occurrences) : null,
        amount: parseFloat(data.amount)
      };

      if (isEditing) {
        return base44.entities.RecurringTransaction.update(template.id, templateData);
      } else {
        return base44.entities.RecurringTransaction.create(templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transactions']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const upcomingDates = getUpcomingOccurrences(formData, 5);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            {isEditing ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input
              value={formData.template_name}
              onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
              placeholder="e.g., Monthly Rent"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Rent payment to landlord"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Account (Debit)</Label>
              <Select value={formData.from_account_id} onValueChange={(val) => setFormData({ ...formData, from_account_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Account (Credit)</Label>
              <Select value={formData.to_account_id} onValueChange={(val) => setFormData({ ...formData, to_account_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_number} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label>Frequency</Label>
            <Select value={formData.frequency} onValueChange={(val) => setFormData({ ...formData, frequency: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly (Every 14 days)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === 'weekly' && (
            <div>
              <Label>Day of Week</Label>
              <Select value={formData.day_of_week?.toString()} onValueChange={(val) => setFormData({ ...formData, day_of_week: parseInt(val) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
            <div>
              <Label>Day of Month</Label>
              <Select value={formData.day_of_month?.toString()} onValueChange={(val) => setFormData({ ...formData, day_of_month: parseInt(val) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">Last day of month</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.frequency === 'yearly' && (
            <div>
              <Label>Month</Label>
              <Select value={formData.month_of_year?.toString()} onValueChange={(val) => setFormData({ ...formData, month_of_year: parseInt(val) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Max Occurrences (Optional)</Label>
            <Input
              type="number"
              value={formData.max_occurrences}
              onChange={(e) => setFormData({ ...formData, max_occurrences: e.target.value })}
              placeholder="Leave empty for indefinite"
            />
          </div>

          <div>
            <Label>Tags (Optional)</Label>
            <TagSelector
              selectedTags={formData.tag_ids}
              onChange={(tags) => setFormData({ ...formData, tag_ids: tags })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.skip_weekends}
                onCheckedChange={(checked) => setFormData({ ...formData, skip_weekends: checked })}
              />
              <Label className="cursor-pointer">Skip weekends (move to next Monday)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.require_review}
                onCheckedChange={(checked) => setFormData({ ...formData, require_review: checked })}
              />
              <Label className="cursor-pointer">Require manual review before posting</Label>
            </div>
          </div>

          {/* Preview upcoming dates */}
          {upcomingDates.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Upcoming Transaction Dates:
              </p>
              <div className="flex flex-wrap gap-2">
                {upcomingDates.map((date, idx) => (
                  <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-blue-200">
                    {format(date, 'MMM d, yyyy')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
