// src/app/(auth)/login/page.tsx
'use client';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';

export default function LoginPage() {
  return (
    // Main container with the light gray background and gradient shapes, matching your theme
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 overflow-hidden">
      
      {/* Subtle background gradient shapes for a premium feel */}
      <div 
        className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" 
        aria-hidden="true" 
      />

      {/* "Back to Home" Link */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link
          href="/"
          className="flex items-center text-gray-500 hover:text-gray-800 transition-colors font-medium"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/">
            <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" className="h-10 sm:h-12 w-auto" />
          </Link>
        </div>

        {/* LoginForm Component - It contains its own themed card and content */}
        <LoginForm />
      </div>

      {/* A subtle footer for consistency */}
      <footer className="absolute bottom-4 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Billzzy. All rights reserved.</p>
      </footer>
    </main>
  );
}