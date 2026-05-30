import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, AtSign } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionComments({ transactionId, onCommentAdded }) {
  const { currentBusiness, user } = useBusiness();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [taggedUser, setTaggedUser] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['transaction-comments', transactionId],
    queryFn: () => base44.entities.TransactionComment.filter({
      transaction_id: transactionId,
      is_deleted: false
    }, '-created_date'),
    enabled: !!transactionId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', currentBusiness?.id],
    queryFn: async () => {
      const access = await base44.entities.UserBusinessAccess.filter({
        business_id: currentBusiness.id
      });
      const userEmails = access.map(a => a.user_email);
      const users = await base44.entities.User.list();
      return users.filter(u => userEmails.includes(u.email) && u.email !== user.email);
    },
    enabled: !!currentBusiness
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      const comment = await base44.entities.TransactionComment.create(data);
      
      // Log activity
      await base44.entities.ActivityLog.create({
        business_id: currentBusiness.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        action_type: 'comment_added',
        action_description: `${user.full_name || user.email} commented on a transaction`,
        entity_type: 'transaction',
        entity_id: transactionId
      });

      // Send email notification if user is tagged
      if (data.tagged_user_email) {
        await base44.integrations.Core.SendEmail({
          to: data.tagged_user_email,
          subject: `You were mentioned in a transaction comment`,
          body: `${user.full_name || user.email} mentioned you in a comment:\n\n"${data.comment_text}"\n\nView the transaction in your accounting system.`
        });
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transaction-comments']);
      queryClient.invalidateQueries(['activity-log']);
      setNewComment('');
      setTaggedUser('');
      if (onCommentAdded) onCommentAdded();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      business_id: currentBusiness.id,
      transaction_id: transactionId,
      comment_text: newComment.trim(),
      created_by_email: user.email,
      created_by_name: user.full_name || user.email,
      tagged_user_email: taggedUser || undefined
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MessageSquare className="w-4 h-4" />
        Comments ({comments.length})
      </div>

      {/* Existing Comments */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.map(comment => (
          <Card key={comment.id} className="p-4">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {comment.created_by_name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.created_by_name}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.created_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                {comment.tagged_user_email && (
                  <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
                    <AtSign className="w-3 h-3" />
                    Tagged {comment.tagged_user_email}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No comments yet. Add the first comment!
          </div>
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment or ask a question..."
          rows={3}
        />

        {teamMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <AtSign className="w-4 h-4 text-gray-500" />
            <Select value={taggedUser} onValueChange={setTaggedUser}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Tag a team member (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No one</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.email} value={member.email}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!newComment.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
