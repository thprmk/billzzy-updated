// src/components/ui/LoadingScreen.tsx
import React from 'react';
// import { LoadingSpinner } from './LoadingSpinner';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="text-center">

        <img 
          src="/assets/billzzy-logo.png" // Assumes your logo is in the `public` folder
          alt="Billzzy Logo" 
          className="h-10 w-auto mx-auto mb-6 animate-pulse" 
        />
        
        {/* <LoadingSpinner className="h-8 w-8 text-indigo-500 mx-auto" /> */}
        
        <p className="mt-4 text-sm text-gray-500">
          Loading...
        </p>

      </div>
    </div>
  );
};