// src/components/landingPage/Hero.tsx
'use client';

import { motion } from "framer-motion";
import Link from 'next/link';
import { CheckCircle2 } from "lucide-react"; // A nice checkmark icon

// Animation variants for a smooth, staggered entrance
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
    "No tech knowledge needed",
    "Automate billing to save time and reduce errors",
    "Expert support is with you at every step",
  ];
  
  // Logos for social proof - replace with your actual partners or remove
  const brandLogos = [
    { name: "Makron", src: "/brands/makron.svg", alt: "Makron Logo" },
    { name: "BBC", src: "/brands/bbc.svg", alt: "BBC Logo" },
    { name: "Unite", src: "/brands/unite.svg", alt: "Unite Logo" },
    { name: "NBC", src: "/brands/nbc.svg", alt: "NBC Universal Logo" },
  ];

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 items-center">
          
          {/* LEFT: Text Content */}
          <motion.div 
            className="text-center lg:text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tighter leading-tight"
              variants={itemVariants}
            >
              We make billing so easy, anyone can do it
            </motion.h1>

            <motion.p 
              className="mt-6 text-lg lg:text-xl text-slate-600 max-w-lg mx-auto lg:mx-0"
              variants={itemVariants}
            >
              Your vision. Your business. We just handle the billing.
            </motion.p>

            <motion.ul className="mt-8 space-y-3 text-left max-w-md mx-auto lg:mx-0" variants={itemVariants}>
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700">{benefit}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4" variants={itemVariants}>
              <Link href="/register">
                <button className="w-full sm:w-auto bg-green-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-green-600 hover:-translate-y-0.5">
                  Get Started
                </button>
              </Link>
              <Link href="#pricing">
                <button className="w-full sm:w-auto bg-white text-slate-700 font-semibold py-3 px-6 rounded-lg border border-slate-300 transition-all duration-300 hover:border-slate-400 hover:-translate-y-0.5">
                  See solutions and pricing
                </button>
              </Link>
            </motion.div>

            {/* Social Proof Logos */}
            <motion.div className="mt-12" variants={itemVariants}>
              <p className="text-sm text-center lg:text-left text-slate-500">Join the world's leading brands</p>
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-6 opacity-60">
                {brandLogos.map(logo => (
                  <img key={logo.name} src={logo.src} alt={logo.alt} className="h-5" />
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT: Image Composition */}
          <motion.div 
            className="relative w-full max-w-lg mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 1, 0.5, 1] }}
          >

            {/* Your Custom PNG Shape Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-auto">
              <img 
                src="/assets/billzzy-background.png" // <-- CHANGE THIS to your image path
                alt="Abstract background shape"
                className="w-full h-full"
              />
            </div>
            
            {/* Real Person Image */}
            <div className="relative z-10 w-4/5 ml-auto">
              <img 
                src="/assets/shopkeeper.png" // <-- REPLACE with your image of a person
                alt="Happy customer using the app" 
                className="w-full h-auto"
              />
            </div>

            {/* App UI Screenshot */}
            {/* <div className="absolute top-8 left-0 w-3/5 z-20">
              <div className="bg-white p-3 rounded-xl shadow-2xl">
                <img 
                  src="" // <-- REPLACE with your app screenshot
                  alt="" 
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div> */}
          </motion.div>
        </div>
      </div>
    </section>
  );
}