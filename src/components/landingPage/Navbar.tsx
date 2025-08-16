// src/components/landingPage/Navbar.tsx
'use client';

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Use Case", href: "#usecase" },
  { name: "Pricing", href: "#pricing" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Listen to scroll position changes
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 10);
  });

  // Effect to lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.nav 
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-300",
          scrolled 
            ? "bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm" 
            : "bg-transparent border-b border-transparent"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-3">
                <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" className="h-10 w-auto" />
              </Link>
              
              <div 
                className="hidden lg:flex items-center gap-2"
                onMouseLeave={() => setHoveredLink(null)}
              >
                {navLinks.map((link) => (
                  <Link 
                    key={link.name}
                    href={link.href}
                    className={cn(
                      "relative rounded-md px-4 py-2 transition-colors duration-300 font-medium",
                      scrolled ? "text-gray-700 hover:text-gray-900" : "text-slate-700 hover:text-slate-900"
                    )}
                    onMouseEnter={() => setHoveredLink(link.name)}
                  >
                    {hoveredLink === link.name && (
                      <motion.div
                        className="absolute inset-0 bg-gray-100/70 rounded-md z-0"
                        layoutId="hover-pill"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                  Login
              </Link>
              <Link href="/register" className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/30 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-px">
                  Get Started
              </Link>
            </div>
            
            <div className="lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                <span className="sr-only">Toggle menu</span>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 top-20 z-40 bg-white lg:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} className="text-xl font-medium text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>
                  {link.name}
                </Link>
              ))}
              <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
                 <Link href="/login" className="w-full text-center px-4 py-3 text-gray-800 font-semibold rounded-lg bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    Login
                 </Link>
                 <Link href="/register" className="w-full text-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                    Get Started
                 </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}