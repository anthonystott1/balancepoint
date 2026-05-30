// import React from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { base44 } from '@/api/base44Client';
// import { useBusiness } from '../business/BusinessContext';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Calendar, Zap, ArrowRight, Check } from 'lucide-react';
// import { format, isToday, addDays, isBefore } from 'date-fns';
// import { shouldGenerateTransaction, calculateNextOccurrence } from './recurringUtils';

// export default function UpcomingRecurringWidget() {
//   const { currentBusiness, user } = useBusiness();
//   const queryClient = useQueryClient();

//   const { data: templates = [] } = useQuery({
//     queryKey: ['recurring-transactions', currentBusiness?.id],
//     queryFn: () => base44.entities.RecurringTransaction.filter({
//       business_id: currentBusiness.id,
//       is_active: true
//     }),
//     enabled: !!currentBusiness
//   });

//   const { data: accounts = [] } = useQuery({
//     queryKey: ['accounts', currentBusiness?.id],
//     queryFn: () => base44.entities.Account.filter({
//       business_id: currentBusiness.id
//     }),
//     enabled: !!currentBusiness
//   });

//   const generateMutation = useMutation({
//     mutationFn: async (template) => {
//       const fromAccount = accounts.find(a => a.id === template.from_account_id);
//       const toAccount = accounts.find(a => a.id === template.to_account_id);

//       // Determine debit/credit based on account types
//       let debitAccountId = template.from_account_id;
//       let creditAccountId = template.to_account_id;

//       if (fromAccount && toAccount) {
//         const normalDebitTypes = ['asset', 'expense'];
//         if (!normalDebitTypes.includes(fromAccount.type)) {
//           [debitAccountId, creditAccountId] = [creditAccountId, debitAccountId];
//         }
//       }

//       // Create transaction
//       const transaction = await base44.entities.Transaction.create({
//         business_id: currentBusiness.id,
//         transaction_date: template.next_occurrence_date,
//         description: template.description,
//         amount: template.amount,
//         source: 'recurring',
//         from_account_id: template.from_account_id,
//         to_account_id: template.to_account_id,
//         is_cleared: false,
//         notes: `Auto-generated from: ${template.template_name}`
//       });

//       // Create transaction lines
//       await base44.entities.TransactionLine.bulkCreate([
//         {
//           transaction_id: transaction.id,
//           business_id: currentBusiness.id,
//           account_id: debitAccountId,
//           debit_amount: template.amount,
//           credit_amount: 0
//         },
//         {
//           transaction_id: transaction.id,
//           business_id: currentBusiness.id,
//           account_id: creditAccountId,
//           debit_amount: 0,
//           credit_amount: template.amount
//         }
//       ]);

//       // Apply tags
//       if (template.tag_ids && template.tag_ids.length > 0) {
//         await base44.entities.TransactionTag.bulkCreate(
//           template.tag_ids.map(tag_id => ({
//             transaction_id: transaction.id,
//             tag_id,
//             business_id: currentBusiness.id
//           }))
//         );
//       }

//       // Update template
//       const nextOccurrence = calculateNextOccurrence(template, new Date(template.next_occurrence_date));
//       await base44.entities.RecurringTransaction.update(template.id, {
//         occurrences_generated: (template.occurrences_generated || 0) + 1,
//         last_generated_date: template.next_occurrence_date,
//         next_occurrence_date: nextOccurrence.toISOString().split('T')[0]
//       });

//       // Log activity
//       await base44.entities.ActivityLog.create({
//         business_id: currentBusiness.id,
//         user_email: user.email,
//         user_name: user.full_name || user.email,
//         action_type: 'transaction_created',
//         action_description: `Auto-generated recurring transaction: ${template.description}`,
//         entity_type: 'transaction',
//         entity_id: transaction.id
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries(['recurring-transactions']);
//       queryClient.invalidateQueries(['transactions']);
//     }
//   });

//   // Get upcoming in next 7 days
//   const upcomingTemplates = templates
//     .filter(t => {
//       if (!t.next_occurrence_date) return false;
//       const nextDate = new Date(t.next_occurrence_date);
//       const weekFromNow = addDays(new Date(), 7);
//       return isBefore(nextDate, weekFromNow);
//     })
//     .sort((a, b) => new Date(a.next_occurrence_date) - new Date(b.next_occurrence_date))
//     .slice(0, 5);

//   const readyToGenerate = templates.filter(t => shouldGenerateTransaction(t));

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2 text-lg">
//           <Zap className="w-5 h-5 text-indigo-600" />
//           Upcoming Automatic Transactions
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         {readyToGenerate.length > 0 && (
//           <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
//             <p className="text-sm font-medium text-indigo-900 mb-2">
//               {readyToGenerate.length} transaction{readyToGenerate.length !== 1 ? 's' : ''} ready to generate
//             </p>
//             {readyToGenerate.map(template => {
//               const fromAccount = accounts.find(a => a.id === template.from_account_id);
//               const toAccount = accounts.find(a => a.id === template.to_account_id);

//               return (
//                 <div key={template.id} className="flex items-center justify-between bg-white p-2 rounded mb-2 last:mb-0">
//                   <div className="flex-1">
//                     <p className="text-sm font-medium">{template.description}</p>
//                     <p className="text-xs text-gray-500">
//                       ${template.amount.toFixed(2)} • {fromAccount?.name} → {toAccount?.name}
//                     </p>
//                   </div>
//                   <Button
//                     size="sm"
//                     onClick={() => generateMutation.mutate(template)}
//                     disabled={generateMutation.isPending}
//                   >
//                     <Check className="w-4 h-4 mr-1" />
//                     Generate
//                   </Button>
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         <div className="space-y-2">
//           {upcomingTemplates.map(template => {
//             const fromAccount = accounts.find(a => a.id === template.from_account_id);
//             const toAccount = accounts.find(a => a.id === template.to_account_id);
//             const nextDate = new Date(template.next_occurrence_date);
//             const isDue = isToday(nextDate);

//             return (
//               <div key={template.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
//                 <div className="flex items-center gap-3 flex-1">
//                   <div className="text-center">
//                     <p className="text-xs text-gray-500">{format(nextDate, 'MMM')}</p>
//                     <p className="text-lg font-bold">{format(nextDate, 'd')}</p>
//                   </div>
//                   <div className="flex-1">
//                     <p className="text-sm font-medium">{template.description}</p>
//                     <p className="text-xs text-gray-500">
//                       {fromAccount?.name} → {toAccount?.name}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-sm font-semibold">${template.amount.toFixed(2)}</p>
//                     {isDue && <Badge className="text-xs bg-orange-100 text-orange-700">Due today</Badge>}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}

//           {upcomingTemplates.length === 0 && readyToGenerate.length === 0 && (
//             <p className="text-sm text-gray-500 text-center py-4">
//               No upcoming automatic transactions in the next 7 days
//             </p>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// src/components/recurring/UpcomingRecurringWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { recurringTransactionsAPI } from '../../api/index';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';

export default function UpcomingRecurringWidget() {
  const { currentBusiness } = useBusiness();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['recurring-transactions', currentBusiness?.id],
    queryFn: () => recurringTransactionsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  // Show anything due in the next 30 days
  const upcoming = templates
    .filter(t => t.next_occurrence_date)
    .filter(t => {
      const next = parseISO(t.next_occurrence_date);
      return next <= addDays(new Date(), 30);
    })
    .slice(0, 6);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-500" />
          Upcoming Recurring
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 pb-5">
            No upcoming recurring transactions.{' '}
            <Link to="/recurring-transactions" className="text-indigo-500 hover:underline">Create one</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map(t => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.template_name}</p>
                  <p className="text-xs text-gray-400">
                    {format(parseISO(t.next_occurrence_date), 'MMM d')} · {t.frequency}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  ${(t.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}