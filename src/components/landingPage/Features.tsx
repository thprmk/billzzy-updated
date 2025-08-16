// src/components/landingPage/Partners.tsx
'use client';

import { motion } from "framer-motion";
import { LayoutGrid, Clock, Heart, Tag } from "lucide-react";

const partnerTypes = [
  // ... (partnerTypes array remains the same)
  {
    id: "retail",
    title: "Order Confirmation Automation",
    description: "Instantly confirm orders and reduce errors with automated confirmations.",
    image: "/assets/bilz1.png",
  },
  {
    id: "e-commerce",
    title: "Automatic Amount Confirmation",
    description: "Automatically verify amounts to avoid discrepancies and manual checks.",
    image: '/assets/b2.png',
  },
  {
    id: "small-business",
    title: "Label Printing",
    description: "Seamlessly print labels for shipping and inventory management.",
    image: "/assets/b3.png",
  },
  {
    id: "logistics",
    title: "Packing & Tracking Automation",
    description: "Automate packing and track orders in real-time for better inventory control.",
    image: "/assets/b4.png",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Partners() {
  return (
    <section id="partners" className="py-20 sm:py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter text-gray-900">
              Key Features to Simplify Your Business
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful tools that automate manual tasks and boost your efficiency.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
            variants={containerVariants} initial="hidden" 
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {partnerTypes.map((partner) => (
              <motion.div
                key={partner.id}
                variants={itemVariants}
                className="bg-gray-50/70 rounded-lg border border-gray-200/80 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* 
                  THE KEY CHANGE IS HERE:
                  - `aspect-[16/9]` is the default (for mobile and tablet)
                  - `lg:aspect-[3/4]` applies ONLY on large screens and up
                */}
                <div className="aspect-[16/9] lg:aspect-[3/4] w-full overflow-hidden rounded-t-lg">
                  <img src={partner.image} alt={partner.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{partner.title}</h3>
                  <p className="mt-2 text-base text-gray-600 leading-relaxed">{partner.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}