// src/components/ui/SharePopup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, MessageCircle } from 'lucide-react';

interface SharePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePopup({ isOpen, onClose }: SharePopupProps) {
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setLink('');

      const generateAndShareLink = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/billing/generateLink', { method: 'POST' });
          if (!response.ok) throw new Error('Failed to generate');
          const data = await response.json();
          setLink(data.link);
        } catch (error) {
          toast.error('Failed to generate link.');
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      
      generateAndShareLink();
    }
  }, [isOpen, onClose]);

  const copyToClipboard = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!link) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(link)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* --- TEXT CORRECTED HERE --- */}
          <DialogTitle className="text-xl">Share Address Link</DialogTitle>
          <DialogDescription>
            Send this link to your customer to securely collect their shipping address.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="share-link" className="text-sm font-medium">
                Address Collection Link
              </label>
              <div className="relative flex items-center">
                <Input id="share-link" value={link} readOnly className="pr-12 text-sm text-gray-700" />
                <Button size="icon" variant="ghost" className="absolute right-1 h-8 w-8" onClick={copyToClipboard}>
                  {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button onClick={shareToWhatsApp} disabled={isLoading || !link} className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white">
            <MessageCircle className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}