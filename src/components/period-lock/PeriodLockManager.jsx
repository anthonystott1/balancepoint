import React, { useState } from 'react';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Shield, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import LockWarningDialog from './LockWarningDialog';

export default function PeriodLockManager() {
  const { currentBusiness, user, canAdmin } = useBusiness();
  const queryClient = useQueryClient();
  const [lockStartDate, setLockStartDate] = useState('');
  const [lockEndDate, setLockEndDate] = useState('');
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [affectedTxCount, setAffectedTxCount] = useState(0);

  const { data: locks = [] } = useQuery({
    queryKey: ['period-locks', currentBusiness?.id],
    queryFn: () => base44.entities.PeriodLock.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => base44.entities.Transaction.filter({
      business_id: currentBusiness.id,
      is_deleted: false
    }),
    enabled: !!currentBusiness?.id
  });

  const lockPeriodMutation = useMutation({
    mutationFn: async (reason) => {
      return await base44.entities.PeriodLock.create({
        business_id: currentBusiness.id,
        lock_type: 'custom',
        lock_start_date: lockStartDate,
        lock_end_date: lockEndDate,
        locked_by: user.email,
        locked_date: new Date().toISOString(),
        lock_reason: reason,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-locks', currentBusiness.id] });
      setLockStartDate('');
      setLockEndDate('');
      setIsWarningOpen(false);
    }
  });

  const unlockPeriodMutation = useMutation({
    mutationFn: async ({ lockId, reason }) => {
      return await base44.entities.PeriodLock.update(lockId, {
        is_active: false,
        unlocked_by: user.email,
        unlocked_date: new Date().toISOString(),
        unlock_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-locks', currentBusiness.id] });
    }
  });

  const handleLockClick = () => {
    if (!lockStartDate || !lockEndDate) return;

    // Count affected transactions
    const count = transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date);
      return txDate >= new Date(lockStartDate) && txDate <= new Date(lockEndDate);
    }).length;

    setAffectedTxCount(count);
    setIsWarningOpen(true);
  };

  const handleUnlock = (lock) => {
    const reason = prompt('Enter reason for unlocking this period:');
    if (reason) {
      unlockPeriodMutation.mutate({ lockId: lock.id, reason });
    }
  };

  const activeLocks = locks.filter(l => l.is_active);
  const inactiveLocks = locks.filter(l => !l.is_active);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">About Period Locking</p>
              <p className="text-sm text-blue-700 mt-1">
                Locking prevents accidental changes to finalized books. Locked periods cannot be edited 
                without admin approval. This is essential for maintaining accurate financial records and 
                audit trails, especially after filing taxes or closing books.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lock New Period */}
      {canAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-600" />
              Lock a Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="lock_start">Start Date</Label>
                <Input
                  id="lock_start"
                  type="date"
                  value={lockStartDate}
                  onChange={(e) => setLockStartDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lock_end">End Date</Label>
                <Input
                  id="lock_end"
                  type="date"
                  value={lockEndDate}
                  onChange={(e) => setLockEndDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button 
              onClick={handleLockClick}
              disabled={!lockStartDate || !lockEndDate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Period
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Locks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Active Locks ({activeLocks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLocks.length === 0 ? (
            <p className="text-sm text-gray-500">No periods are currently locked</p>
          ) : (
            <div className="space-y-3">
              {activeLocks.map(lock => (
                <div key={lock.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-orange-600" />
                        <span className="font-semibold text-gray-900">
                          {format(new Date(lock.lock_start_date), 'MMM d, yyyy')} - 
                          {format(new Date(lock.lock_end_date), 'MMM d, yyyy')}
                        </span>
                        <Badge className="bg-orange-100 text-orange-800">Locked</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Reason:</strong> {lock.lock_reason}
                      </p>
                      {lock.locked_date && (
                        <p className="text-xs text-gray-500">
                          Locked by {lock.locked_by} on {format(new Date(lock.locked_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                    {canAdmin() && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-700 hover:bg-red-50"
                        onClick={() => handleUnlock(lock)}
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Unlock
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock History */}
      {inactiveLocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Unlock History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveLocks.map(lock => (
                <div key={lock.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlock className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      {format(new Date(lock.lock_start_date), 'MMM d, yyyy')} - 
                      {format(new Date(lock.lock_end_date), 'MMM d, yyyy')}
                    </span>
                    <Badge variant="outline">Unlocked</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Lock Reason:</strong> {lock.lock_reason}
                  </p>
                  {lock.unlock_reason && (
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Unlock Reason:</strong> {lock.unlock_reason}
                    </p>
                  )}
                  {lock.unlocked_date && (
                    <p className="text-xs text-gray-500">
                      Unlocked by {lock.unlocked_by} on {format(new Date(lock.unlocked_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Dialog */}
      <LockWarningDialog
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        onConfirm={(reason) => lockPeriodMutation.mutate(reason)}
        isSubmitting={lockPeriodMutation.isPending}
        lockStartDate={lockStartDate}
        lockEndDate={lockEndDate}
        affectedTransactionsCount={affectedTxCount}
      />
    </div>
  );
}
