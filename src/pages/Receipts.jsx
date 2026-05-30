// src/pages/Receipts.jsx
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import { useAuth } from '../contexts/AuthContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { receiptsAPI } from '../api/index';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { FileText, Upload, Search, Trash2, Eye, Loader2, Receipt, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CATEGORIES = ['Meals', 'Travel', 'Supplies', 'Utilities', 'Equipment', 'Software', 'Marketing', 'Professional Services', 'Other'];

function UploadDialog({ open, onClose, onSubmit, isPending }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    vendor_name: '', receipt_date: new Date().toISOString().split('T')[0],
    amount: '', category: '', notes: '',
  });
  const fileRef = useRef();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Receipt</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg p-6 text-center cursor-pointer transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop a file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Vendor Name</Label>
              <Input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Receipt Date</Label>
              <Input type="date" value={form.receipt_date} onChange={e => set('receipt_date', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit({ file, form })}
              disabled={!file || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingReceipt, setDeletingReceipt] = useState(null);
  const [viewingUrl, setViewingUrl] = useState(null);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', currentBusiness?.id],
    queryFn: () => receiptsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, form }) => {
      // Upload file to Supabase Storage
      const ext = file.name.split('.').pop();
      const path = `${currentBusiness.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file);

      // If storage bucket doesn't exist yet, fall back to storing metadata only
      let fileUrl = '';
      if (uploadError) {
        console.warn('Storage upload failed (bucket may not exist):', uploadError.message);
        fileUrl = `pending:${file.name}`;
      } else {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);
        fileUrl = publicUrl;
      }

      return receiptsAPI.create({
        business_id: currentBusiness.id,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        upload_date: new Date().toISOString(),
        uploaded_by: user.email,
        vendor_name: form.vendor_name || null,
        receipt_date: form.receipt_date || null,
        amount: form.amount ? parseFloat(form.amount) : null,
        category: form.category || null,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setShowUpload(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => receiptsAPI.delete(id, user.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setDeletingReceipt(null);
    },
  });

  const filtered = receipts.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.vendor_name?.toLowerCase().includes(q) ||
           r.category?.toLowerCase().includes(q) ||
           r.notes?.toLowerCase().includes(q) ||
           r.file_name?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-8 h-8 text-indigo-600" />
            Receipts
          </h1>
          <p className="text-gray-500 mt-1">Store and organize receipts and expense documents</p>
        </div>
        {canEdit() && (
          <Button onClick={() => setShowUpload(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Upload className="w-4 h-4 mr-2" />Upload Receipt
          </Button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input placeholder="Search by vendor, category, or notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{searchQuery ? 'No receipts match your search' : 'No receipts yet'}</p>
          {!searchQuery && canEdit() && (
            <Button onClick={() => setShowUpload(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Upload className="w-4 h-4 mr-2" />Upload Your First Receipt
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(receipt => (
            <Card key={receipt.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* File preview / icon */}
                <div
                  className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={() => receipt.file_url && !receipt.file_url.startsWith('pending:') && setViewingUrl(receipt.file_url)}
                >
                  {receipt.file_type?.startsWith('image/') && !receipt.file_url?.startsWith('pending:') ? (
                    <img src={receipt.file_url} alt={receipt.file_name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <FileText className="w-10 h-10 text-gray-300" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{receipt.vendor_name || receipt.file_name}</p>
                  {receipt.receipt_date && (
                    <p className="text-xs text-gray-500">{format(parseISO(receipt.receipt_date), 'MMM d, yyyy')}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {receipt.amount && (
                      <span className="text-sm font-semibold text-gray-900">
                        ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {receipt.category && (
                      <Badge variant="outline" className="text-xs">{receipt.category}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {receipt.file_url && !receipt.file_url.startsWith('pending:') && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewingUrl(receipt.file_url)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />View
                    </Button>
                  )}
                  {canEdit() && (
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => setDeletingReceipt(receipt)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadDialog
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onSubmit={data => uploadMutation.mutate(data)}
          isPending={uploadMutation.isPending}
        />
      )}

      {/* Lightbox */}
      {viewingUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewingUrl(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingUrl(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
            {viewingUrl.endsWith('.pdf') ? (
              <iframe src={viewingUrl} className="w-full h-[80vh] rounded-lg" title="Receipt" />
            ) : (
              <img src={viewingUrl} alt="Receipt" className="max-h-[85vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingReceipt} onOpenChange={() => setDeletingReceipt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingReceipt?.vendor_name || deletingReceipt?.file_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingReceipt.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Receipts() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <ReceiptsContent />
    </RequireBusinessAccess>
  );
}