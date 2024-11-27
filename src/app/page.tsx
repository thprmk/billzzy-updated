'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import { ContactModal } from '@/components/settings/ContactModal';
import React from 'react';  // Add this import
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <nav className="bg-transparent">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-3xl font-bold text-white"
            >
              Billz
            </motion.div>
            <div className="space-x-4">
            <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 h-[80vh] place-content-center py-16">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 text-white">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              Enhance Your Business Operations with Billz!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-lg mb-8"
            >
              Elevate your offline sales with our analytics dashboard, inventory management, and SMS
              updates from order to delivery.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 1 }}
              className="space-x-4"
            >
              <Link href="/login">
                <Button size="lg">
                  Log In <FaArrowRight className="inline-block ml-2" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Sign Up <FaArrowRight className="inline-block ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1 }}>
              {/* Replace with your SVG or Lottie animation */}
              <DotLottieReact
      src="https://lottie.host/fc65b1de-e629-440b-b462-43760711d928/gfzPi6hKY6.lottie"
      loop
      autoplay
    />
            </motion.div>
          </div>
        </div>
      </main>



      <footer className="bg-transparent w-[100%] absolute bottom-3">
        <div className="container mx-auto px-6 py-4">
          <div className="text-center text-white">
            <p>© 2024 Billz. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
