// src/components/landingPage/Navbar.tsx
'use client';

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import React, { useState } from 'react';
import { cn } from "@/lib/utils"; // Assuming you have a utility for classnames

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Use Case", href: "#usecase" },
  { name: "Pricing", href: "#pricing" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // This hook listens to the scroll position
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 10); // Becomes true after scrolling down 10px
  });

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.nav 
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        // Apply styles based on scroll position
        scrolled 
          ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" 
          : "bg-transparent border-b border-transparent"
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div className="flex items-center gap-10">
            {/* Logo */}
            <a 
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleScrollToTop}
            >
              <img
                src="/assets/billzzy-logo.png"
                alt="Billzzy Logo"
                className="h-10 w-auto"
              />
            </a>
            
            {/* Navigation Links */}
            <div 
              className="hidden lg:flex items-center gap-2"
              onMouseLeave={() => setHoveredLink(null)}
            >
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href}
                  className="relative text-slate-700 rounded-md px-4 py-2 transition-colors duration-300 font-medium hover:text-slate-900"
                  onMouseEnter={() => setHoveredLink(link.name)}
                >
                  {hoveredLink === link.name && (
                    <motion.div
                      className="absolute inset-0 bg-slate-100/70 rounded-md z-0"
                      layoutId="hover-pill"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT: Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login" legacyBehavior>
              <a className="px-4 py-2 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
                Login
              </a>
            </Link>
            <Link href="/register" legacyBehavior>
              <a className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/30 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-px transform-gpu focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Get Started
              </a>
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Link href="/register">
              <button className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm">
                Get Started
              </button>
            </Link>
          </div>

        </div>
      </div>
    </motion.nav>
  );
}