import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';

function safeFormat(dateValue, fmt = 'MMM d, yyyy') {
  if (!dateValue) return '—';
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return isValid(d) ? format(d, fmt) : '—';
}

export default function LockWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  lockStartDate,
  lockEndDate,
  affectedTransactionsCount,
}) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const handleConfirm = () => onConfirm(reason);

  const handleClose = () => {
    setConfirmText('');
    setReason('');
    onClose();
  };

  const isConfirmValid = confirmText.toUpperCase() === 'LOCK' && reason.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            Lock Accounting Period
          </DialogTitle>
          <DialogDescription>
            This action will prevent changes to transactions in this period
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-semibold mb-2">What happens when you lock this period?</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-800">
                    <li>No one can edit or delete transactions in this period</li>
                    <li>No new transactions can be added to this period</li>
                    <li>Only admin users can unlock this period</li>
                    <li>Adjustments require special entries with documented reasons</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Lock Period</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {safeFormat(lockStartDate)} – {safeFormat(lockEndDate)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Affected Transactions</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {affectedTransactionsCount ?? 0} transactions
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="reason">
              Reason for Locking <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Month-end closing for tax filing, Year-end finalization"
              className="mt-1.5 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">This will be recorded in the audit trail</p>
          </div>

          <div>
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">LOCK</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="LOCK"
              className="mt-1.5 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmValid || isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Period
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}