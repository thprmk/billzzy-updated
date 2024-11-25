import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

// app/register/page.tsx
export default function RegisterPage() {
  return (
    <div className=" w-full h-[100vh] flex flex-col bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center text-white hover:text-gray-200 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex  items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        

          <RegisterForm />
        </div>
      </div>

      
    </div>
  );
}