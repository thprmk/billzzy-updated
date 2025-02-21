'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import { ContactModal } from '@/components/settings/ContactModal';
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative">
      <nav className="bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-2xl sm:text-3xl font-bold text-white"
            >
              Billzzy
            </motion.div>
            <div className="space-x-2 sm:space-x-4">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-white hover:bg-white/20"
                onClick={() => setIsModalOpen(true)}
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 flex items-center min-h-[calc(100vh-140px)]">
        <div className="flex flex-col md:flex-row items-center justify-between w-full">
          <div className="w-full md:w-1/2 text-white">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6"
            >
              Enhance Your Business Operations with Billzzy!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-base sm:text-lg mb-6 sm:mb-8"
            >
              Elevate your offline sales with our analytics dashboard, inventory management, and SMS
              updates from order to delivery.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 1 }}
              className="flex flex-wrap gap-3 sm:space-x-4"
            >
              <Link href="/login">
                <Button size="sm" className="text-sm sm:text-base sm:h-10">
                  Log In <FaArrowRight className="inline-block ml-2" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" variant="outline" className="text-sm sm:text-base sm:h-10">
                  Sign Up <FaArrowRight className="inline-block ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
          <div className="w-full md:w-1/2 mt-8 md:mt-0 max-w-[400px] mx-auto md:max-w-none">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ duration: 1 }}
              className="w-full h-[250px] sm:h-[300px] md:h-[350px]"
            >
              <DotLottieReact
                src="https://lottie.host/fc65b1de-e629-440b-b462-43760711d928/gfzPi6hKY6.lottie"
                loop
                autoplay
              />
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="bg-transparent w-full py-3 absolute bottom-0">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center text-white text-sm sm:text-base">
            <p>© 2024 Billzzy. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}