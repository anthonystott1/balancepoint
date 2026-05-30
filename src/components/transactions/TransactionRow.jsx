import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LastModifiedInfo from '../audit/LastModifiedInfo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, ArrowRight, CheckCircle2, Circle, Paperclip } from 'lucide-react';
import AccountTypeIcon from '../accounts/AccountTypeIcon';
import ReceiptViewer from '../receipts/ReceiptViewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TAG_COLORS = {
  gray:   'bg-gray-100 text-gray-700 border-gray-300',
  blue:   'bg-blue-100 text-blue-700 border-blue-300',
  green:  'bg-green-100 text-green-700 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  red:    'bg-red-100 text-red-700 border-red-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  pink:   'bg-pink-100 text-pink-700 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

const sourceColors = {
  manual:     'bg-blue-100 text-blue-700 border-blue-200',
  import:     'bg-purple-100 text-purple-700 border-purple-200',
  payroll:    'bg-green-100 text-green-700 border-green-200',
  adjustment: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function TransactionRow({
  transaction,
  accounts,
  tags = [],
  onEdit,
  onDelete,
  canEdit,
}) {
  const [showReceipts, setShowReceipts] = React.useState(false);

  // Receipts query — wired to Supabase directly
  const { data: receipts = [] } = useQuery({
    queryKey: ['transaction-receipts', transaction.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('transaction_id', transaction.id)
        .eq('is_deleted', false);
      if (error) throw error;
      return data;
    },
    enabled: !!transaction.id,
  });

  // amount is derived and injected by Transactions.jsx (getTransactionAmount)
  const amount = transaction.amount ?? 0;

  const fromAccount = accounts.find(a => a.id === transaction.from_account_id);
  const toAccount   = accounts.find(a => a.id === transaction.to_account_id);

  return (
    <>
      <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
        <div className="flex items-start gap-4 flex-1 min-w-0 mb-3 md:mb-0">
          {/* Cleared indicator */}
          <div className="flex items-center gap-2 pt-1">
            {transaction.is_cleared ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Date + badges */}
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm text-gray-500">
                {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
              </p>
              {transaction.reference_number && (
                <Badge variant="outline" className="text-xs">
                  #{transaction.reference_number}
                </Badge>
              )}
              {transaction.source && (
                <Badge variant="outline" className={`text-xs ${sourceColors[transaction.source] ?? ''}`}>
                  {transaction.source}
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="font-medium text-gray-900 mb-2">{transaction.description}</p>

            {/* Account flow */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {fromAccount && (
                <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded">
                  <AccountTypeIcon type={fromAccount.type} className="w-3 h-3" />
                  <span className="text-indigo-700 font-medium">{fromAccount.name}</span>
                </div>
              )}
              <ArrowRight className="w-3 h-3 text-gray-400" />
              {toAccount && (
                <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded">
                  <AccountTypeIcon type={toAccount.type} className="w-3 h-3" />
                  <span className="text-green-700 font-medium">{toAccount.name}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {transaction.memo && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-1">{transaction.memo}</p>
            )}

            {/* Tags */}
            {transaction.tagObjects && transaction.tagObjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {transaction.tagObjects.map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={`text-xs ${TAG_COLORS[tag.color] ?? TAG_COLORS.gray}`}
                  >
                    {tag.category && <span className="opacity-70">{tag.category}: </span>}
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side — amount + actions */}
        <div className="flex items-center gap-4 md:ml-4">
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              ${amount.toFixed(2)}
            </p>
          </div>

          {/* Receipt indicator */}
          {receipts.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => setShowReceipts(true)}
            >
              <Paperclip className="w-4 h-4 mr-1" />
              {receipts.length}
            </Button>
          )}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transaction)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Transaction
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(transaction)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Transaction
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Last modified */}
        <div className="px-4 pb-2">
          <LastModifiedInfo record={transaction} />
        </div>
      </div>

      {/* Receipts dialog */}
      <Dialog open={showReceipts} onOpenChange={setShowReceipts}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attached Receipts</DialogTitle>
          </DialogHeader>
          <ReceiptViewer receipts={receipts} />
        </DialogContent>
      </Dialog>
    </>
  );
}