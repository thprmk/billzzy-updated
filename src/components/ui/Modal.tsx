// src/components/ui/Modal.tsx

'use client';

import { useEffect, useState } from 'react'; // <-- Make sure useState is imported
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className
}: ModalProps) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // STEP 1: Define the modal's look in a variable
  const modalContent = (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/20 backdrop-blur-md"    
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative bg-white rounded-lg max-w-lg w-full mx-auto shadow-xl",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {title}
            </h3>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  // STEP 2: If we are in a browser, use the Portal to teleport the content
  if (isBrowser) {
    return ReactDOM.createPortal(
      modalContent,
      document.body
    );
  }

  // STEP 3: Otherwise (on the server), return nothing
  return null;
}