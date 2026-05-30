import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Upload, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function LastModifiedInfo({ record, showSource = true }) {
  if (!record) return null;

  const sourceIcons = {
    manual:     Edit,
    import:     Upload,
    adjustment: Edit,
    payroll:    Edit,
  };

  const sourceLabels = {
    manual:     'Manual Entry',
    import:     'Imported',
    adjustment: 'Adjustment',
    payroll:    'Payroll',
  };

  // Supabase uses updated_at / created_at — fall back gracefully if neither exists
  const rawDate = record.updated_at || record.created_at ||
                  record.updated_date || record.created_date;
  const dateObj = rawDate ? new Date(rawDate) : null;
  const isValidDate = dateObj && !isNaN(dateObj.getTime());

  const SourceIcon = sourceIcons[record.source] || Edit;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Clock className="w-3 h-3" />
      {isValidDate ? (
        <span>Modified {format(dateObj, 'MMM d, yyyy h:mm a')}</span>
      ) : (
        <span>Date unknown</span>
      )}
      {showSource && record.source && (
        <>
          <span>•</span>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <SourceIcon className="w-3 h-3" />
            {sourceLabels[record.source] || record.source}
          </Badge>
        </>
      )}
      {record.created_by && (
        <>
          <span>•</span>
          <span>by {record.created_by}</span>
        </>
      )}
    </div>
  );
}