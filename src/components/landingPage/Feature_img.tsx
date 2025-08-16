// src/components/landingPage/FeatureImage.tsx
'use client';

import { useState, useEffect } from "react";
import { Box, Repeat, Scale, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ourFeatures = [
  // ... (Your ourFeatures array remains the same)
  {
    feature: "Order Confirmation Automation",
    image: "/assets/message.png",
  },
  {
    feature: "Automatic Amount Confirmation",
    image: "/assets/payment.png",
  },
  {
    feature: "Automated Address Entry",
    image: "/assets/address.png",
  },
  {
    feature: "Shipping Partner Integration",
    image: "/assets/shipping.png",
  },
];

const benefits = [
  // ... (Your benefits array remains the same)
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        
        {/* Left Side: Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tighter text-gray-900">
            A smarter way to discover and bill.
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
            We make sense of the market so you can make more strategic choices, faster. Browse dozens of themes and opportunities, dive into data and perspectives, and invest with ease.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-lg mx-auto lg:mx-0">
            {benefits.map((benefit) => (
              <div key={benefit.text} className="flex items-center gap-3">
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
          className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center"
        >
          {/* THE KEY CHANGES ARE HERE: A more detailed phone mockup */}
          <div className="relative w-[280px] h-[560px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-[44px] shadow-2xl shadow-black/40">
            {/* Side Buttons */}
            <div className="absolute left-[-3px] top-[110px] w-1 h-16 bg-gray-700 rounded-l-sm" />
            <div className="absolute right-[-3px] top-[140px] w-1 h-24 bg-gray-700 rounded-r-sm" />
            
            {/* Inner Bezel */}
            <div className="absolute inset-2 bg-black rounded-[36px]">
              {/* Screen Content */}
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
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}