'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import React, { useState } from 'react';

const navVariants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Navbar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Use Case", href: "#usecase" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <motion.nav 
      className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-lg z-50 border-b border-gray-200/80"
      variants={navVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div className="flex items-center gap-10">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleScrollToTop}
            >
              <img
                src="/assets/billzzy-logo.png"
                alt="Billzzy Logo"
                width={100}
                height={100}
              />
              {/* <span className="text-2xl font-bold text-slate-900 tracking-tight">
                Billzzy
              </span> */}
            </div>
            
            {/* Navigation Links */}
            <div 
              className="hidden lg:flex items-center gap-2" // Reduced gap for the pill effect
              onMouseLeave={() => setHoveredLink(null)}
            >
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href}
                  className="relative text-slate-600 rounded-full px-4 py-2 transition-colors duration-300 font-medium"
                  onMouseEnter={() => setHoveredLink(link.name)}
                >
                  {/* The magic moving pill background */}
                  {hoveredLink === link.name && (
                    <motion.div
                      className="absolute inset-0 bg-slate-100 rounded-full z-0"
                      layoutId="hover-pill" // Shared ID for the magic motion
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {/* Text must be relative to be on top */}
                  <span className="relative z-10">
                    {link.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT: Action Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/login">
              <button className="px-4 py-2 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:scale-105 transform-gpu">
                Get Started
              </button>
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Link href="/register">
              <button className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm">
                Get Started
              </button>
            </Link>
          </div>

        </div>
      </div>
    </motion.nav>
  );
}