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
  // ... (Your features array remains the same)
  {
    id: "address-entry",
    icon: ClipboardCheck,
    title: "Automated Address Entry",
    description: "Save time with smart address detection and auto-fill capabilities.",
    image: "/assets/feature-address.jpg",
  },
  {
    id: "amount-confirmation",
    icon: DollarSign,
    title: "Automatic Amount Confirmation",
    description: "Automatically verify amounts to avoid discrepancies and manual checks.",
    image: "/assets/feature-amount.jpg",
  },
  {
    id: "order-confirmation",
    icon: CheckCircle,
    title: "Order Confirmation Automation",
    description: "Instantly confirm orders and reduce errors with automated confirmations.",
    image: "/assets/feature-order.jpg",
  },
  {
    id: "label-printing",
    icon: Printer,
    title: "Label Printing",
    description: "Seamlessly print labels for shipping and inventory management.",
    image: "/assets/feature-printing.jpg",
  },
  {
    id: "tracking-automation",
    icon: Package,
    title: "Packing & Tracking Automation",
    description: "Automate packing and track orders in real-time for better inventory control.",
    image: "/assets/feature-tracking.jpg",
  },
  {
    id: "mobile-management",
    icon: Smartphone,
    title: "Mobile Order Management",
    description: "Manage orders on-the-go with mobile compatibility for your business.",
    image: "/assets/feature-mobile.jpg",
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

  // Effect for the autoplay timer
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Effect for controlling the progress bar animation
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
          <h3 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Purpose-Built. Outcome-Driven. Scalable.
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* THE KEY CHANGE: The two main columns have been swapped */}

          {/* Left Side: Image Showcase (DESKTOP ONLY) */}
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

          {/* Right Side: Vertical Navigation */}
          <div className="flex flex-col gap-8">
            {features.map((item, index) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(index)}
                  className="relative text-left p-2 w-full"
                >
                  <motion.h4
                    animate={{ color: activeIndex === index ? '#4f46e5' : '#1f2937' }}
                    className="text-2xl font-bold"
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
                      className="absolute bottom-[-16px] left-0 w-full h-0.5 bg-indigo-200"
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
                {/* Mobile-only Image, now appears correctly under its content */}
                <div className="mt-8 lg:hidden">
                  <AnimatePresence>
                    {activeIndex === index && (
                       <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                         <div className="relative bg-indigo-100/30 p-4 rounded-2xl ring-1 ring-indigo-200/50">
                           <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
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

        </div>
      </div>
    </section>
  );
}