import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Play, Pause, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
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

export default function RecurringTransactionList({ onEdit }) {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['recurring-transactions', currentBusiness?.id],
    queryFn: () => base44.entities.RecurringTransaction.filter({
      business_id: currentBusiness.id
    }, '-created_date'),
    enabled: !!currentBusiness
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.RecurringTransaction.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transactions']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transactions']);
      setDeleteId(null);
    }
  });

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  };

  return (
    <>
      <div className="space-y-3">
        {templates.map(template => {
          const fromAccount = accounts.find(a => a.id === template.from_account_id);
          const toAccount = accounts.find(a => a.id === template.to_account_id);

          return (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{template.template_name}</h3>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      {template.require_review && (
                        <Badge variant="outline">Requires Review</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{frequencyLabels[template.frequency]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>${template.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      <p>Next: {format(new Date(template.next_occurrence_date), 'MMM d, yyyy')}</p>
                      {fromAccount && toAccount && (
                        <p className="mt-1">
                          {fromAccount.name} → {toAccount.name}
                        </p>
                      )}
                      {template.occurrences_generated > 0 && (
                        <p className="mt-1">Generated {template.occurrences_generated} time{template.occurrences_generated !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: template.id, is_active: checked })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {templates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No recurring transactions yet. Create one to automate repetitive transactions.
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the template. Previously generated transactions will remain in your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
