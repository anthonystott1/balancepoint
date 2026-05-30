import { useMutation, useQueryClient } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';

export function useAuditLog() {
  const { currentBusiness, user } = useBusiness();
  const queryClient = useQueryClient();

  const logAction = async ({ action, entityType, entityId, beforeValues, afterValues }) => {
    if (!currentBusiness || !user) return;

    // Calculate undo expiry (24 hours from now)
    const undoExpiry = new Date();
    undoExpiry.setHours(undoExpiry.getHours() + 24);

    await base44.entities.AuditLog.create({
      business_id: currentBusiness.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_values: beforeValues || null,
      after_values: afterValues || null,
      ip_address: 'browser',
      user_agent: navigator.userAgent,
      can_undo: action !== 'delete',
      undo_expiry: undoExpiry.toISOString()
    });
  };

  const undoAction = useMutation({
    mutationFn: async (auditLogEntry) => {
      const { entity_type, entity_id, before_values, action } = auditLogEntry;

      if (action === 'create') {
        // Undo create = delete
        const Entity = base44.entities[entity_type];
        await Entity.delete(entity_id);
      } else if (action === 'update' && before_values) {
        // Undo update = restore previous values
        const Entity = base44.entities[entity_type];
        await Entity.update(entity_id, before_values);
      }

      // Mark as undone
      await base44.entities.AuditLog.update(auditLogEntry.id, {
        can_undo: false
      });

      // Log the undo action
      await logAction({
        action: 'update',
        entityType: 'AuditLog',
        entityId: auditLogEntry.id,
        beforeValues: { can_undo: true },
        afterValues: { can_undo: false }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-log']);
    }
  });

  return { logAction, undoAction };
}
