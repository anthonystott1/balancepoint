import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuditLog } from './useAuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Undo2, FileText, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isPast } from 'date-fns';

export default function AuditTrail() {
  const { currentBusiness, canAdmin } = useBusiness();
  const { undoAction } = useAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [expandedEntry, setExpandedEntry] = useState(null);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-log', currentBusiness?.id],
    queryFn: () => base44.entities.AuditLog.filter({
      business_id: currentBusiness.id
    }, '-created_date', 200),
    enabled: !!currentBusiness && canAdmin()
  });

  if (!canAdmin()) return null;

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === 'all' || log.user_email === filterUser;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesUser && matchesAction;
  });

  const uniqueUsers = [...new Set(auditLogs.map(log => log.user_email))];

  const handleUndo = (log) => {
    if (window.confirm('Are you sure you want to undo this action? This will restore the previous state.')) {
      undoAction.mutate(log);
    }
  };

  const canUndo = (log) => {
    return log.can_undo && log.undo_expiry && !isPast(new Date(log.undo_expiry));
  };

  const actionColors = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Trail
        </CardTitle>
        <p className="text-sm text-gray-500">
          Complete history of all changes in your business
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by entity type or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {uniqueUsers.map(email => (
                <SelectItem key={email} value={email}>{email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.map(log => (
            <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={actionColors[log.action]}>
                      {log.action.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{log.entity_type}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{log.user_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{format(new Date(log.created_date), 'MMM d, yyyy h:mm:ss a')}</span>
                    <span>•</span>
                    <span>ID: {log.entity_id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canUndo(log) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUndo(log)}
                      disabled={undoAction.isPending}
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      Undo
                    </Button>
                  )}
                  {(log.before_values || log.after_values) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedEntry(expandedEntry === log.id ? null : log.id)}
                    >
                      {expandedEntry === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedEntry === log.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {log.before_values && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">BEFORE:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.before_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after_values && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">AFTER:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.after_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.user_agent && (
                    <p className="text-xs text-gray-500">Device: {log.user_agent.slice(0, 80)}...</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No audit logs found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
