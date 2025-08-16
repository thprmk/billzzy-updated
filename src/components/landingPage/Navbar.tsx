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

const mobileMenuContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } }
};

const mobileMenuItemVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } },
  exit: { opacity: 0, y: -20 }
};

// Animation variants for the clean cross-fade hamburger icon
const iconVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2, ease: "easeIn" } },
};

export default function Navbar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 10);
  });

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
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
          <div className="flex justify-between items-center h-16 md:h-20">
            
            <div className="flex items-center gap-4 md:gap-8 lg:gap-10">
              <Link href="/" className="flex items-center gap-3">
                <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" className="h-8 md:h-10 w-auto" />
              </Link>
              
              <div 
                className="hidden md:flex items-center gap-1"
                onMouseLeave={() => setHoveredLink(null)}
              >
                {navLinks.map((link) => (
                  <Link 
                    key={link.name} href={link.href}
                    className={cn( "relative rounded-md px-3 py-2 transition-colors duration-300 font-medium",
                      scrolled ? "text-gray-800 hover:text-gray-900" : "text-slate-700 hover:text-slate-900"
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

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                  Login
              </Link>
              <Link href="/register" className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/30 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-px">
                  Get Started
              </Link>
            </div>
            
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative w-6 h-6">
                <span className="sr-only">Toggle menu</span>
                <AnimatePresence initial={false}>
                  {isMobileMenuOpen ? (
                     <motion.div key="close" variants={iconVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0">
                       <X className="w-6 h-6" />
                     </motion.div>
                  ) : (
                     <motion.div key="open" variants={iconVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0">
                       <Menu className="w-6 h-6" />
                     </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 top-16 z-40 bg-white md:hidden"
          >
            <motion.div 
              className="flex flex-col items-center justify-center h-full gap-6 p-8"
              variants={mobileMenuContainerVariants}
              initial="hidden" animate="visible" exit="exit"
            >
              {navLinks.map((link) => (
                <motion.div key={link.name} variants={mobileMenuItemVariants}>
                  <Link href={link.href} className="text-xl font-medium text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
                 <motion.div variants={mobileMenuItemVariants} className="w-full">
                   {/* THE CHANGE IS HERE: Updated styling for the login button */}
                   <Link href="/login" className="block w-full text-center px-4 py-3 text-indigo-600 font-semibold rounded-lg ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                      Login
                   </Link>
                 </motion.div>
                 <motion.div variants={mobileMenuItemVariants} className="w-full">
                   <Link href="/register" className="block w-full text-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                      Get Started
                   </Link>
                 </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}