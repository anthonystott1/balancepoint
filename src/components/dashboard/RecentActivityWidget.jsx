import React from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, User, FileText, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentActivityWidget() {
  const { currentBusiness } = useBusiness();

  const { data: activityLog = [] } = useQuery({
    queryKey: ['activity-log', currentBusiness?.id],
    queryFn: () => base44.entities.ActivityLog.filter({
      business_id: currentBusiness.id
    }, '-created_date', 10),
    enabled: !!currentBusiness
  });

  const getActivityIcon = (actionType) => {
    if (actionType.includes('transaction')) return FileText;
    if (actionType.includes('period_locked')) return Lock;
    if (actionType.includes('period_unlocked')) return Unlock;
    if (actionType.includes('user')) return User;
    return Activity;
  };

  const getActivityColor = (actionType) => {
    if (actionType.includes('deleted')) return 'text-red-600';
    if (actionType.includes('created')) return 'text-green-600';
    if (actionType.includes('locked')) return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activityLog.map((activity) => {
            const Icon = getActivityIcon(activity.action_type);
            const color = getActivityColor(activity.action_type);

            return (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action_description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">{activity.user_name || activity.user_email}</p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {activityLog.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
