// src/components/landingPage/UseCases.tsx
'use client';

import { useState } from "react";
import { Store, Briefcase, Home, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const useCases = [
  // ... (Your useCases array remains the same)
  {
    id: "retail",
    icon: Store,
    title: "Retail",
    highlightedText: "retail business",
    description: "Streamline inventory management with a unified dashboard, enabling both online and in-person collection while enhancing conversion rates.",
    image: "/assets/retail.jpg",
  },
  {
    id: "e-commerce",
    icon: Briefcase,
    title: "E-Commerce",
    highlightedText: "e-commerce business",
    description: "Create online bills, generate shipping labels, and automatically notify customers when orders are created, packed, and dispatched.",
    image: '/assets/wholesale.jpg',
  },
  {
    id: "small-business",
    icon: Home,
    title: "Small Business",
    highlightedText: "growing business",
    description: "Track sales, manage inventory, and analyze performance through our dashboard, helping you make data-driven decisions.",
    image: "/assets/localservice1.jpg",
  },
  {
    id: "logistics",
    icon: Truck,
    title: "Logistics",
    highlightedText: "delivery business",
    description: "Integrate with courier services, generate tracking IDs, and provide automatic SMS updates on shipment status and timelines.",
    image: "/assets/delivery.jpg",
  },
];

// A single, refined transition object for a consistent, cinematic feel
const transition = { 
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] // A premium "Quint" ease-out curve
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

const imageVariants = {
  enter: { opacity: 0, scale: 1.05 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
};

export default function UseCases() {
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    const newPage = (page + newDirection + useCases.length) % useCases.length;
    setPage([newPage, newDirection]);
  };

  const selectedTab = useCases[page];

  return (
    <section id="usecase" className="py-24 sm:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Powering every industry.
          </h2>
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mt-2">
            Powering all disruptors.
          </h2>
        </div>

        <div className="flex">
          {useCases.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setPage([index, index > page ? 1 : -1])}
              className={cn( "relative py-3 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors",
                page === index ? "text-indigo-600" : "text-gray-400 hover:text-gray-800"
              )}
            >
              {item.title}
              {page === index && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -1000) paginate(1);
            else if (swipe > 1000) paginate(-1);
          }}
          className="relative mt-12 min-h-[550px] cursor-grab active:cursor-grabbing"
        >
          <AnimatePresence initial={false} custom={direction}>
            {/* Layer 1: Background Image */}
            <motion.div
              key={page}
              custom={direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="absolute inset-0 w-full h-full"
            >
              <img src={selectedTab.image} alt={selectedTab.title} className="w-full h-full object-cover rounded-2xl" />
            </motion.div>

            {/* Layer 2: Floating Content Box */}
            <motion.div
              key={page + 1}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ ...transition, delay: 0.1 }} // Subtle delay for a layered effect
              className="relative p-8 sm:p-12 md:absolute md:left-12 md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5"
            >
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Empower your <br /> 
                <span className="text-indigo-600">{selectedTab.highlightedText}</span>
              </h3>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                {selectedTab.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Pagination Dots */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
            {useCases.map((_, index) => (
              <button
                key={index}
                onClick={() => setPage([index, index > page ? 1 : -1])}
                className="relative h-6 w-6 flex items-center justify-center rounded-full"
              >
                <div className={cn("h-2 w-2 rounded-full transition-colors", page === index ? "bg-indigo-600" : "bg-gray-300 hover:bg-gray-400")} />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}