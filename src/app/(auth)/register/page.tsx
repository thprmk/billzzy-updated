// import RegisterForm from "@/components/auth/RegisterForm";
// import Link from "next/link";
// import { FiArrowLeft } from "react-icons/fi";
// import React from 'react';  // Add this import


// // app/register/page.tsx
// export default function RegisterPage() {
//   return (
//     <div className=" w-full h-[100vh] flex flex-col bg-[#235CDF]">
//       <div className="absolute top-4 left-4">
//         <Link
//           href="/"
//           className="flex items-center text-white hover:text-gray-200 transition-colors"
//         >
//           <FiArrowLeft className="mr-2" />
//           Back to Home
//         </Link>
//       </div>

//       <div className="flex-1 flex  items-center justify-center px-4 sm:px-6 lg:px-8">
//         <div className="max-w-md w-full space-y-8">
        

//           <RegisterForm />
//         </div>
//       </div>

      
//     </div>
//   );
// }




'use client';

import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";
import React from 'react';

export default function RegisterPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      
      {/* Billzzy Logo at Top */}
      <div className="mb-6 text-center">
        <Link href="/">
          <img
            src="/assets/billzzy-logo.png"
            alt="Billzzy Logo"
            className="h-14 w-auto mx-auto"
          />
        </Link>
      </div>

      {/* Register Form Component */}
      <div className="w-full max-w-sm">
        <RegisterForm />
      </div>
    </div>
  );
}
