import React from 'react';
// base44 removed
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { FileText, Image as ImageIcon, Trash2, ExternalLink, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function ReceiptViewer({ receipts, showTransaction = false }) {
  const { user, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [deleteReceiptId, setDeleteReceiptId] = React.useState(null);

  const deleteMutation = useMutation({
    mutationFn: async (receiptId) => {
      return await base44.entities.Receipt.update(receiptId, {
        is_deleted: true,
        deleted_date: new Date().toISOString(),
        deleted_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-receipts'] });
      setDeleteReceiptId(null);
    }
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    }
    return <FileText className="w-5 h-5 text-red-600" />;
  };

  if (!receipts || receipts.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No receipts attached
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {receipts.map(receipt => (
          <Card key={receipt.id} className="border bg-white">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Preview or Icon */}
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                  {receipt.file_type.startsWith('image/') ? (
                    <img
                      src={receipt.file_url}
                      alt={receipt.file_name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    getFileIcon(receipt.file_type)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {receipt.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {receipt.file_type.split('/')[1].toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(receipt.file_size)}
                    </span>
                  </div>
                  {receipt.vendor_name && (
                    <p className="text-xs text-gray-600 mt-1">
                      Vendor: {receipt.vendor_name}
                    </p>
                  )}
                  {receipt.upload_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded {format(new Date(receipt.upload_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(receipt.file_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {canEdit() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteReceiptId(receipt.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReceiptId} onOpenChange={() => setDeleteReceiptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? The file will be marked as deleted
              but preserved for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteReceiptId)}
            >
              Delete Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
