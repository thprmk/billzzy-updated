// src/components/landingPage/CtaSection.tsx
'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

const features = [
  "Quick onboarding",
  "24x7 support",
];

export default function CtaSection() {
  return (
    <section id="cta" className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-20 sm:py-20 lg:py-20 overflow-hidden">
      {/* Refined Dynamic Background Shape */}
      <div className="absolute inset-0 w-full h-full transform -skew-y-3 bg-gradient-to-r from-indigo-600 to-indigo-800 origin-top-left" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-y-16 lg:gap-12 items-center">
          
          {/* Left Side: Text Content */}
          <motion.div
            className="lg:col-span-3 text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Supercharge your business with Billzzy
            </h2>
            <p className="mt-6 text-lg text-indigo-200 max-w-xl mx-auto lg:mx-0">
              Sign up now to experience the future of billing and offer your customers the best checkout experience.
            </p>
          
            <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-4 text-white font-medium">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex justify-center lg:justify-start">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 bg-white text-indigo-700 py-3 px-8 rounded-lg font-semibold text-lg transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-lg">
                  Sign Up Now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Right Side: Illustration */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            <img 
              src="/assets/contact.png" 
              alt="Billzzy dashboard illustration"
              className="w-3/4 h-auto mx-auto"
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}