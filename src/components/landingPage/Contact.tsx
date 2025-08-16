// src/components/landingPage/CtaSection.tsx
'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";

// Corrected the component name
export default function Contact() {
  return (
    <section id="cta" className="bg-indigo-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          // 1. Adaptive padding: Taller on mobile, leaner on desktop
          className="relative isolate overflow-hidden bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-2xl rounded-3xl max-w-6xl mx-auto px-6 py-16 sm:px-12 lg:px-16 lg:py-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* 2. Responsive layout with adaptive gaps */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-y-10 lg:gap-y-0 lg:gap-x-16">
            <div className="max-w-xl">
              {/* 3. Fluid typography for the heading */}
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Boost your productivity.<br/> Start using our app today.
              </h2>
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-x-3">
                <Phone className="h-5 w-5 text-indigo-200" aria-hidden="true" />
                {/* 4. Responsive font size for contact info */}
                <a href="tel:7339249430" className="text-sm sm:text-base font-semibold text-white hover:underline">
                  Or Call Us 7339249430
                </a>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Link href="/register">
                <button
                  className="rounded-md bg-white px-8 py-3 text-base font-semibold text-indigo-600 shadow-sm transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get started
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}