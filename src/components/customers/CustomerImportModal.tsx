// src/components/customers/CustomerImportModal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
import React from 'react';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function CustomerImportModal({ isOpen, onClose, onImportComplete }: CustomerImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // For drag-and-drop UI

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  // Drag-and-drop event handlers
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import customers.');
      }
      toast.success(`${result.importedCount} customers imported. ${result.skippedCount} skipped.`);
      onImportComplete();
      handleClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null); // Reset file on close
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Customers">
      <div className="p-6">
        {/* --- INSTRUCTION SECTION --- */}
        <div className="mb-6 space-y-2">
          <p className="text-sm text-gray-600">
            Import multiple customers at once by uploading a formatted Excel or CSV file.
          </p>
          <a 
            href="/templates/customer_template.csv" 
            download 
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <DownloadIcon className="h-4 w-4" />
            Download Template
          </a>
        </div>

        {/* --- UPLOAD SECTION --- */}
        <div className="space-y-4">
          {file ? (
            // --- SELECTED FILE DISPLAY ---
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 text-indigo-800 p-3 rounded-lg">
              <div className="flex items-center gap-3 text-sm">
                <FileIcon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium truncate">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600">
                <CrossIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            // --- DRAG AND DROP ZONE ---
            <label
              htmlFor="customer-file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging ? 'bg-indigo-50 border-indigo-400' : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              }`}
            >
              <UploadIcon className="h-8 w-8 text-gray-400 mb-2" />
              <p className="font-semibold text-gray-700">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-500 mt-1">Excel (.xlsx) or CSV (.csv)</p>
              <input id="customer-file-upload" type="file" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" />
            </label>
          )}
        </div>
        
        {/* --- ACTION BUTTONS --- */}
        <div className="flex justify-end space-x-2 pt-6 mt-6 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading} disabled={!file || isLoading}>
            {isLoading ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- SVG Icons for a clean, modern UI ---
function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
}
function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
}
function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function CrossIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}