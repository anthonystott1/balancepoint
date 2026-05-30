// src/components/business/RequireBusinessAccess.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '../ui/button';

const PERMISSION_RANK = {
  readonly:   1,
  editor:     2,
  accountant: 3,
  admin:      4,
};

/**
 * Wraps a page and enforces:
 *  1. A business is selected (redirects to /business-setup if none)
 *  2. The user has at least `requiredPermission` on that business
 *
 * Usage:
 *   <RequireBusinessAccess requiredPermission="editor">
 *     <MyPage />
 *   </RequireBusinessAccess>
 *
 * Default requiredPermission is "readonly" (any logged-in user with access).
 */
export default function RequireBusinessAccess({
  children,
  requiredPermission = 'readonly',
}) {
  const { currentBusiness, userAccess, loading, businesses } = useBusiness();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // No businesses at all → send to setup
  if (!loading && businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">No business yet</h2>
        <p className="text-gray-500 max-w-sm">
          Create your first business to start using BalancePoint.
        </p>
        <Button onClick={() => navigate('/business-setup')} className="bg-indigo-600 hover:bg-indigo-700">
          Create Business
        </Button>
      </div>
    );
  }

  // Business selected but user lacks required permission
  if (currentBusiness && userAccess) {
    const userRank = PERMISSION_RANK[userAccess.permission_level] ?? 0;
    const requiredRank = PERMISSION_RANK[requiredPermission] ?? 1;

    if (userRank < requiredRank) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500 max-w-sm">
            You need <strong>{requiredPermission}</strong> permission to view this page.
            Ask a business admin to update your access level.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
