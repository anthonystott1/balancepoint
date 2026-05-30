import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, FileText, Lock, Unlock, MessageSquare, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_ICONS = {
  transaction_created: FileText,
  transaction_updated: FileText,
  transaction_deleted: FileText,
  period_locked: Lock,
  period_unlocked: Unlock,
  adjustment_entry: FileText,
  comment_added: MessageSquare,
  user_invited: UserPlus,
  user_removed: UserMinus
};

const ACTION_COLORS = {
  transaction_created: 'bg-green-100 text-green-600',
  transaction_updated: 'bg-blue-100 text-blue-600',
  transaction_deleted: 'bg-red-100 text-red-600',
  period_locked: 'bg-orange-100 text-orange-600',
  period_unlocked: 'bg-purple-100 text-purple-600',
  adjustment_entry: 'bg-yellow-100 text-yellow-600',
  comment_added: 'bg-indigo-100 text-indigo-600',
  user_invited: 'bg-teal-100 text-teal-600',
  user_removed: 'bg-gray-100 text-gray-600'
};

export default function ActivityLogViewer() {
  const { currentBusiness, isAccountant, canAdmin } = useBusiness();
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity-log', currentBusiness?.id],
    queryFn: () => base44.entities.ActivityLog.filter({
      business_id: currentBusiness.id
    }, '-created_date', 100),
    enabled: !!currentBusiness && (isAccountant() || canAdmin())
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', currentBusiness?.id],
    queryFn: async () => {
      const access = await base44.entities.UserBusinessAccess.filter({
        business_id: currentBusiness.id
      });
      const userEmails = access.map(a => a.user_email);
      const users = await base44.entities.User.list();
      return users.filter(u => userEmails.includes(u.email));
    },
    enabled: !!currentBusiness
  });

  if (!isAccountant() && !canAdmin()) {
    return null;
  }

  const filteredActivities = activities.filter(activity => {
    if (filterType !== 'all' && activity.action_type !== filterType) return false;
    if (filterUser !== 'all' && activity.user_email !== filterUser) return false;
    return true;
  });

  const uniqueActionTypes = [...new Set(activities.map(a => a.action_type))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <CardTitle>Activity Log</CardTitle>
          </div>
          <Badge variant="outline">Accountant View</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {uniqueActionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.email} value={member.email}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredActivities.map(activity => {
            const Icon = ACTION_ICONS[activity.action_type] || Activity;
            const colorClass = ACTION_COLORS[activity.action_type] || 'bg-gray-100 text-gray-600';

            return (
              <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action_description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{activity.user_name}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(activity.created_date), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No activity found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
