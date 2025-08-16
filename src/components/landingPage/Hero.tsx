// src/components/landingPage/Hero.tsx
'use client';

import { motion } from "framer-motion";
import Link from 'next/link';
import { CheckCircle2 } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

export default function Hero() {
  const benefits = [
    "Free Support",
    "Expert support is with you at every step",
  ];
  
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 items-center">
          
          {/* LEFT: Text Content */}
          {/* THE CHANGE IS HERE: Added responsive order classes */}
          <motion.div 
            className="text-center lg:text-left order-last lg:order-first"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tighter leading-tight"
              variants={itemVariants}
            >
             Empowering Your Sales, Simplifying Your Workflow
            </motion.h1>

            <motion.p 
              className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-lg mx-auto lg:mx-0"
              variants={itemVariants}
            >
              Streamline your billing process and boost productivity with automated address entry and smart order management.
            </motion.p>

            <motion.ul className="mt-8 space-y-3" variants={itemVariants}>
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center justify-center lg:justify-start">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700">{benefit}</span>
                </li>
              ))}
            </motion.ul>

            {/* THE CHANGE IS HERE: Simplified flex classes to always be horizontal */}
            <motion.div className="mt-10 flex flex-row items-center justify-center lg:justify-start gap-4" variants={itemVariants}>
              <Link href="/register">
                <button className="w-full sm:w-auto bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5">
                  Get Started
                </button>
              </Link>
              <Link href="#pricing">
                <button className="w-full sm:w-auto bg-white text-slate-700 font-semibold py-3 px-6 rounded-lg border border-slate-300 transition-all duration-300 hover:border-slate-400 hover:-translate-y-0.5">
                  Learn More
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT: Image Composition */}
          {/* THE CHANGE IS HERE: Added responsive order classes */}
          <motion.div 
            className="relative w-full max-w-lg mx-auto order-first lg:order-last"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-auto">
              <img 
                src="/assets/billzzy-background.png"
                alt="Abstract background shape"
                className="w-full h-full"
              />
            </div>
            
            <div className="relative z-10 w-4/5 mx-auto">
              <img 
                src="/assets/shopperson.png"
                alt="Happy customer using the app" 
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}