import React, { useState, useRef } from 'react';
// base44 removed
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, X, FileText, Image as ImageIcon } from 'lucide-react';

export default function ReceiptUpload({ transactionId, onUploadComplete }) {
  const { currentBusiness, user } = useBusiness();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create receipt record
      const receipt = await base44.entities.Receipt.create({
        business_id: currentBusiness.id,
        transaction_id: transactionId || null,
        file_url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        upload_date: new Date().toISOString(),
        uploaded_by: user.email,
        is_deleted: false
      });
      
      return receipt;
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-receipts'] });
      if (onUploadComplete) {
        onUploadComplete(receipt);
      }
    }
  });

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type`);
        return false;
      }
      
      if (file.size > maxSize) {
        alert(`${file.name} is too large (max 10MB)`);
        return false;
      }
      
      return true;
    });

    // Upload each file
    for (const file of validFiles) {
      setUploadingFiles(prev => [...prev, file.name]);
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error) {
        console.error('Upload failed:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mb-3">
          PDF, JPG, PNG, HEIC • Max 10MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose Files
        </Button>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="space-y-2">
            {uploadingFiles.map((fileName, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-gray-700">Uploading {fileName}...</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
