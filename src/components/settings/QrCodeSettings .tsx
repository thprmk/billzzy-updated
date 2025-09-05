// src/components/settings/qrcode.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';

const QR_TRIGGER_WORD = "Magic Bill";

interface GowhatsSettings {
  whatsappNumber: string;
}

export default function QrCodeSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<GowhatsSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // --- CHANGE THIS LINE ---
        // OLD: const response = await fetch('/api/organisation/whatsapp-settings');
        // NEW:
        const response = await fetch('/api/settings/whatsapp'); // Use the correct App Router API path

        if (!response.ok) {
            // This will now catch the 404 if settings are not found
            throw new Error(`Could not load WhatsApp settings. Server responded with ${response.status}`);
        }
        
        const result = await response.json();

        // --- AND CHANGE THESE LINES ---
        // The new API wraps data in a 'data' property
        if (!result.success || !result.data || !result.data.whatsappNumber) {
            throw new Error('WhatsApp Business Number is not configured. Please complete your WhatsApp settings first.');
        }
        
        // Set the settings from the 'data' object
        setSettings(result.data);

      } catch (err: any) {
        setError(err.message);
        toast.error(err.message, { autoClose: 5000 });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ... rest of your component remains the same
  const handleDownloadQRCode = () => {
    if (qrCodeRef.current?.querySelector('canvas')) {
      const canvas = qrCodeRef.current.querySelector('canvas') as HTMLCanvasElement;
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Shop_Magic_Link_QR_Code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading QR Code configuration...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Cannot Generate QR Code</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => router.push('/settings?tab=whatsapp')}>
            Go to WhatsApp Settings
        </Button>
      </div>
    );
  }

  if (settings) {
    // This part should now work perfectly
    const qrCodeValue = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(QR_TRIGGER_WORD)}`;
    
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Shop's QR Code</h1>
        <p className="text-gray-500 mb-8">
            Display this code on your counter for the "Magic  Bill" feature.
        </p>
        <div className="flex flex-col items-center gap-6 mt-4">
            <div ref={qrCodeRef} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <QRCodeCanvas value={qrCodeValue} size={220} level={"H"} includeMargin={true} />
            </div>
            <div className="text-center">
                <p className="mt-2 text-sm text-gray-500">Links to your number: <span className="font-semibold text-base">{settings.whatsappNumber}</span></p>
                <p className="mt-4 text-sm text-gray-500">Pre-fills the message:</p>
                <p className="text-indigo-600 bg-indigo-50 rounded px-3 py-1 mt-1 inline-block font-medium">"{QR_TRIGGER_WORD}"</p>
                <Button onClick={handleDownloadQRCode} className="mt-8 w-full max-w-xs">
                    Download as PNG
                </Button>
            </div>
        </div>
      </div>
    );
  }

  return <div className="p-4">An unexpected error occurred. Please check the console.</div>;
}