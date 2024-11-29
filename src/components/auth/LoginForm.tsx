'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import {toast} from 'react-toastify'
import React from 'react';  // Add this import



export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
   
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });
  

      if (result?.error) {
        setError(result.error);
        return;
      }

  
      // router.push('/dashboard');
      router.refresh();


           // Check role and redirect accordingly
           const response = await fetch('/api/auth/session');
           const session = await response.json();
          console.log(session);
          
           if (session?.user?.role === 'admin') {
             router.push('/admin');
           } else {
             router.push('/dashboard');
           }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
      toast.success("Login Successfull")

    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center">
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          disabled={isLoading}
          className="w-full px-4 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            className="w-full px-4 py-2 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}