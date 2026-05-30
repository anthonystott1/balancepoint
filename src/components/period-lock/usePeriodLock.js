import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { isWithinInterval, parseISO } from 'date-fns';

export function usePeriodLock(businessId) {
  const { data: locks = [], isLoading } = useQuery({
    queryKey: ['period-locks', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('period_locks')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const isDateLocked = (date) => {
    if (!date || locks.length === 0) return false;
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    return locks.some(lock => {
      const startDate = parseISO(lock.lock_start_date);
      const endDate   = parseISO(lock.lock_end_date);
      return isWithinInterval(checkDate, { start: startDate, end: endDate });
    });
  };

  const getLocksForPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end   = typeof endDate   === 'string' ? parseISO(endDate)   : endDate;
    return locks.filter(lock => {
      const lockStart = parseISO(lock.lock_start_date);
      const lockEnd   = parseISO(lock.lock_end_date);
      return lockStart <= end && lockEnd >= start;
    });
  };

  return { locks, isLoading, isDateLocked, getLocksForPeriod };
}