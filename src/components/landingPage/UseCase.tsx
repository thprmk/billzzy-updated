// src/components/landingPage/Features.tsx
'use client';

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  DollarSign,
  CheckCircle,
  Printer,
  Package,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";

const features = [
  {
    id: "Retail",
    icon: ClipboardCheck,
    title: "Retail",
    description: "Billz streamlines inventory management, billing, and customer tracking for retail businesses, with built-in SMS notifications to keep customers updated from order to delivery.",
    image: "/assets/b6.png",
  },
  {
    id: "E-commerce",
    icon: DollarSign,
    title: "E-commerce",
    description: "Create professional online bills with tracking numbers, generate shipping labels, and automatically notify customers when orders are created, packed, and dispatched.",
    image: "/assets/b7.png",
  },
  {
    id: "Small Businesses",
    icon: CheckCircle,
    title: "Small Businesses",
    description: "Track sales, manage inventory, and analyze business performance through our comprehensive dashboard, helping small businesses make data-driven decisions.",
    image: "/assets/b8.png",
  },
  {
    id: "Logistics & Delivery",
    icon: Printer,
    title: "Logistics & Delivery",
    description: "Integrate with courier services, generate tracking IDs, and provide automatic SMS updates to customers about their shipment status and delivery timeline.",
    image: "/assets/b9.png",
  },
];

const textVariants = {
  initial: { opacity: 0, height: 0, y: 10 },
  animate: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};

const imageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3, ease: 'easeIn' } },
};

const AUTOPLAY_INTERVAL = 5000;

export default function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimationControls();

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    controls.stop();
    controls.set({ scaleX: 0 });
    if (!isHovered) {
      controls.start({
        scaleX: 1,
        transition: { duration: AUTOPLAY_INTERVAL / 1000, ease: 'linear' }
      });
    }
  }, [activeIndex, isHovered, controls]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
  };
  
  const activeFeature = features[activeIndex];

  return (
    <section 
      id="features" 
      className="py-24 sm:py-32 bg-white overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl text-center mx-auto mb-16 sm:mb-20">

          <motion.h2 
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter text-gray-900"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            Industry Use Cases
          </motion.h2>
          <motion.p
            className="mt-6 text-lg text-gray-600"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
          >
            Billzzy is adaptable to various industries, improving efficiency and simplifying operations.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Side: Vertical Navigation */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {features.map((item, index) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(index)}
                  className="relative text-left p-2 w-full"
                >
                  <motion.h4
                    animate={{ color: activeIndex === index ? '#4f46e5' : '#1f2937' }}
                    className="text-xl sm:text-2xl font-bold"
                  >
                    {item.title}
                  </motion.h4>
                  <div className="overflow-hidden">
                    <AnimatePresence>
                      {activeIndex === index && (
                        <motion.p
                          variants={textVariants} initial="initial" animate="animate" exit="exit"
                          className="mt-2 text-gray-600 leading-relaxed"
                        >
                          {item.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  {activeIndex === index ? (
                    <motion.div
                      layoutId="active-feature-underline"
                      className="absolute bottom-[-16px] left-0 w-full h-0.5 bg-indigo-100"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                      <motion.div 
                        className="h-full bg-indigo-600"
                        style={{ transformOrigin: 'left' }}
                        animate={controls}
                      />
                    </motion.div>
                  ) : (
                     <div className="absolute bottom-[-16px] left-0 w-full h-0.5 bg-gray-200" />
                  )}
                </button>
                {/* Mobile-only Image */}
                <div className="mt-8 lg:hidden">
                  <AnimatePresence>
                    {activeIndex === index && (
                       <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}}>
                         <div className="relative bg-indigo-100/30 p-4 rounded-2xl ring-1 ring-indigo-200/50">
                           <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
                              <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover"/>
                           </div>
                         </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>

          {/* Right Side: Image Showcase (DESKTOP ONLY) */}
          <div className="w-full hidden lg:block sticky top-24">
            <div className="relative bg-indigo-100/30 p-4 rounded-2xl ring-1 ring-indigo-200/50">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeFeature.id}
                    src={activeFeature.image}
                    alt={activeFeature.title}
                    variants={imageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
            </div>
            <p className="mt-4 text-right text-sm font-medium text-gray-500">
              {activeIndex + 1}/{features.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}