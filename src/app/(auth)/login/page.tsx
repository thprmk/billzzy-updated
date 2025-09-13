// // src/app/(auth)/login/page.tsx
// 'use client';
// import LoginForm from '@/components/auth/LoginForm';
// import Link from 'next/link';
// import React from 'react';
// import { FiArrowLeft } from 'react-icons/fi';

// export default function LoginPage() {
//   return (
//     // Main container with the light gray background and gradient shapes, matching your theme
//     <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 overflow-hidden">
      
//       {/* Subtle background gradient shapes for a premium feel */}
//       <div 
//         className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" 
//         aria-hidden="true" 
//       />
//       <div 
//         className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" 
//         aria-hidden="true" 
//       />

//       {/* "Back to Home" Link */}
//       <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
//         <Link
//           href="/"
//           className="flex items-center text-gray-500 hover:text-gray-800 transition-colors font-medium"
//         >
//           <FiArrowLeft className="mr-2 h-4 w-4" />
//           Back to Home
//         </Link>
//       </div>

//       <div className="relative z-10 w-full flex flex-col items-center justify-center">
//         {/* Logo */}
//         <div className="mb-8">
//           <Link href="/">
//             <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" className="h-10 sm:h-12 w-auto" />
//           </Link>
//         </div>

//         {/* LoginForm Component - It contains its own themed card and content */}
//         <LoginForm />
//       </div>

//       {/* A subtle footer for consistency */}
//       <footer className="absolute bottom-4 text-center text-gray-400 text-sm">
//         <p>© {new Date().getFullYear()} Billzzy. All rights reserved.</p>
//       </footer>
//     </main>
//   );
// }




// src/app/(auth)/login/page.tsx
'use client';

import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import React, { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { FaWhatsapp, FaHeadphones } from 'react-icons/fa';
import { FaHeadset } from 'react-icons/fa6'; // New headset icon

export default function LoginPage() {
  const [showModal, setShowModal] = useState(false);

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/8524089733', '_blank');
  };

  const handlePhoneClick = () => {
    window.open('tel:8524089733');
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-gray-50 overflow-hidden">
      {/* Back to Home */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm sm:text-base"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 flex flex-col">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/">
            <img
              src="/assets/billzzy-logo.png"
              alt="Billzzy Logo"
              className="h-14 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          "Welcome back"
        </h1>
        
        {/* Login Form */}
        <LoginForm />

        {/* Forgot Password */}
        <div className="mt-4 text-left">
          <Link
            href="/forgot-password"
            className="text-sm text-indigo-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Register link */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          New to Billzzy?{' '}
          <Link href="/register" className="text-indigo-600 hover:underline">
            Get started
          </Link>
        </div>
      </div>

      {/* Floating Customer Support Icon */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowModal(!showModal)}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition"
        >
          <FaHeadphones className="h-6 w-6" /> {/* Floating headset */}
        </button>

        {/* Popup Modal above the icon */}
        {showModal && (
          <div className="absolute bottom-16 right-0 bg-white p-4 rounded-lg shadow-lg w-44">
            <h2 className="text-sm font-semibold mb-6 text-gray-800 text-center leading-snug">
              Need help?<br />Contact Our <span className="text-indigo-600">Billzzy</span> Team
            </h2>
            <div className="flex justify-center space-x-6">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppClick}
                className="text-green-600 hover:text-green-700"
              >
                <FaWhatsapp className="h-7 w-7" />
              </button>

              {/* Customer Care (Different Headset) */}
              <button
                onClick={handlePhoneClick}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <FaHeadset className="h-7 w-7" /> 
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
