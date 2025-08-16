// src/components/landingPage/FeatureImage.tsx
'use client';

import { useState, useEffect } from "react";
import { Box, Repeat, Scale, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ourFeatures = [
  {
    feature: "Order Confirmation Automation",
    image: "/assets/msg.jpg",
  },
  {
    feature: "Automatic Amount Confirmation",
    image: "/assets/razorpay.jpg",
  },
  {
    feature: "Automated Address Entry",
    image: "/assets/details.png",
  },
  {
    feature: "Shipping Partner Integration",
    image: "/assets/ship.png",
  },
];

const benefits = [
  { icon: Box, text: "Explore 50+ product collections" },
  { icon: Repeat, text: "Buy and sell with $0 commissions" },
  { icon: Scale, text: "Weigh pros and cons at a glance" },
  { icon: Zap, text: "Get started with just $1" },
];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

const transition = {
  x: { type: "spring", stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

export default function FeatureImage() {
  const [[imageIndex, direction], setImageState] = useState([0, 0]);
  const [isHovered, setIsHovered] = useState(false);

  const paginate = (newDirection: number) => {
    const newIndex = (imageIndex + newDirection + ourFeatures.length) % ourFeatures.length;
    setImageState([newIndex, newDirection]);
  };

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 3000);
    return () => clearInterval(timer);
  }, [isHovered, imageIndex]);

  return (
    <section 
      id="features" 
      className="bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
        
        {/* Left Side: Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center lg:text-left order-last lg:order-first"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-gray-900">
            A smarter way to discover and bill.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
            We make sense of the market so you can make more strategic choices, faster. Browse dozens of themes and opportunities, dive into data and perspectives, and invest with ease.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-lg mx-auto lg:mx-0">
            {benefits.map((benefit) => (
              <div key={benefit.text} className="flex items-center justify-center lg:justify-start gap-3">
                <benefit.icon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: High-Fidelity Phone Mockup */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full flex items-center justify-center order-first lg:order-last"
        >
          <div className="relative w-[240px] h-[480px] sm:w-[280px] sm:h-[560px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-[44px] shadow-2xl shadow-black/40">
            <div className="absolute left-[-3px] top-[90px] w-1 h-14 bg-gray-700 rounded-l-sm" />
            <div className="absolute right-[-3px] top-[120px] w-1 h-20 bg-gray-700 rounded-r-sm" />
            
            <div className="absolute inset-2 bg-black rounded-[36px]">
              <div className="absolute inset-2 bg-white rounded-[32px] overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.img
                    key={imageIndex}
                    src={ourFeatures[imageIndex].image}
                    alt={ourFeatures[imageIndex].feature}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="absolute w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 sm:w-24 sm:h-6 bg-black rounded-b-xl" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}