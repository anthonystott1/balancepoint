import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Trash2, Loader2, UserPlus } from 'lucide-react';

const permissionColors = {
  admin:      'bg-violet-100 text-violet-700 border-violet-200',
  accountant: 'bg-orange-100 text-orange-700 border-orange-200',
  editor:     'bg-blue-100 text-blue-700 border-blue-200',
  readonly:   'bg-gray-100 text-gray-600 border-gray-200',
};

const permissionLabels = {
  admin:      'Administrator',
  accountant: 'Accountant',
  editor:     'Editor',
  readonly:   'View Only',
};

function TeamManagementContent() {
  const { currentBusiness, canAdmin } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newMember, setNewMember] = useState({ email: '', permission_level: 'readonly' });

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['teamMembers', currentBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_business_access')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentBusiness?.id
  });

  const addMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      // Check if access already exists for this email + business
      const { data: existing } = await supabase
        .from('user_business_access')
        .select('id')
        .eq('user_email', memberData.email)
        .eq('business_id', currentBusiness.id);

      if (existing && existing.length > 0) {
        throw new Error('This user already has access to this business.');
      }

      // Create the access record
      // Note: user_id will be null until the invited user logs in
      // and can be linked. For now we track by email.
      const { data, error } = await supabase
        .from('user_business_access')
        .insert([{
          user_email: memberData.email,
          business_id: currentBusiness.id,
          permission_level: memberData.permission_level,
          is_default: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', currentBusiness.id] });
      setIsAddDialogOpen(false);
      setNewMember({ email: '', permission_level: 'readonly' });
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ accessId, permission_level }) => {
      const { error } = await supabase
        .from('user_business_access')
        .update({ permission_level })
        .eq('id', accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', currentBusiness.id] });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (accessRecord) => {
      const { error } = await supabase
        .from('user_business_access')
        .delete()
        .eq('id', accessRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', currentBusiness.id] });
      setDeleteConfirm(null);
    }
  });

  const handleAddMember = (e) => {
    e.preventDefault();
    addMemberMutation.mutate(newMember);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              Team Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage who has access to {currentBusiness.display_name}
            </p>
          </div>

          {canAdmin() && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="colleague@company.com"
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label>Permission Level</Label>
                    <Select
                      value={newMember.permission_level}
                      onValueChange={(value) => setNewMember(prev => ({ ...prev, permission_level: value }))}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="readonly">View Only — can view reports and transactions</SelectItem>
                        <SelectItem value="editor">Editor — can add and edit transactions</SelectItem>
                        <SelectItem value="accountant">Accountant — can adjust locked periods</SelectItem>
                        <SelectItem value="admin">Administrator — full control</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <strong>Note:</strong> The user must already have an account. Email invitations
                    require an email service integration (not yet configured). Access will be
                    granted when they next log in.
                  </div>

                  {addMemberMutation.isError && (
                    <p className="text-sm text-red-600">{addMemberMutation.error.message}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Add Member'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Team Members List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} with access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-medium">
                        {(member.user_email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.user_email}</p>
                        {member.user_email === user?.email && (
                          <span className="text-xs text-indigo-600">You</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canAdmin() && member.user_email !== user?.email ? (
                        <>
                          <Select
                            value={member.permission_level}
                            onValueChange={(value) =>
                              updatePermissionMutation.mutate({
                                accessId: member.id,
                                permission_level: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="readonly">View Only</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="accountant">Accountant</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(member)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge className={`${permissionColors[member.permission_level]} border`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {permissionLabels[member.permission_level]}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No team members yet. Add someone to get started.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Legend */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mt-6">
          <CardHeader>
            <CardTitle className="text-base">Permission Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <div key={key} className="flex items-start gap-3">
                  <Badge className={`${permissionColors[key]} border mt-0.5`}>{label}</Badge>
                  <p className="text-gray-600">
                    {key === 'admin'      && 'Full control — period locks, team management, delete'}
                    {key === 'accountant' && 'All financial entry + adjustments in locked periods'}
                    {key === 'editor'     && 'Create and edit transactions, invoices, budgets'}
                    {key === 'readonly'   && 'View all data and reports, no changes'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Remove Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{deleteConfirm?.user_email}</strong> from{' '}
                {currentBusiness.display_name}? They will no longer be able to access this business.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => removeMemberMutation.mutate(deleteConfirm)}
              >
                {removeMemberMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function TeamManagement() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <TeamManagementContent />
    </RequireBusinessAccess>
  );
}