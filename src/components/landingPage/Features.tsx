// src/components/landingPage/Partners.tsx
'use client';

import { motion } from "framer-motion";
import { LayoutGrid, Clock, Heart, Tag } from "lucide-react";

const benefits = [
  // ... (benefits array remains the same)
  {
    icon: LayoutGrid,
    title: "Diversify your services",
    description: "Add 10+ business finance offerings with zero effort.",
  },
  {
    icon: Clock,
    title: "Save time and effort",
    description: "Save 98% of time & cost while managing clients.",
  },
  {
    icon: Heart,
    title: "Delight your clients",
    description: "Delight clients with simplified business processes.",
  },
  {
    icon: Tag,
    title: "Get exclusive offers",
    description: "Get an exclusive discount for your clients.",
  },
];

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
    <section id="partners" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Key Features to Simplify Your Business
          </h2>
        </div>

        {/* Top Benefits Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-20"
          variants={containerVariants} initial="hidden" whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {benefits.map((benefit) => (
            <motion.div key={benefit.title} variants={itemVariants}>
              <benefit.icon className="w-10 h-10 text-indigo-600 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900">{benefit.title}</h3>
              <p className="mt-2 text-base text-gray-600">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Partner Cards Grid */}
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10"
            variants={containerVariants} initial="hidden" 
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {partnerTypes.map((partner) => (
              <motion.div
                key={partner.id}
                variants={itemVariants}
                // THE CHANGE IS HERE: Decreased border curve from rounded-xl to rounded-lg
                className="bg-gray-50/70 rounded-lg border border-gray-200/80 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* THE CHANGE IS HERE: Matched the top corners to the new curve */}
                <div className="aspect-[3/4] w-full overflow-hidden rounded-t-lg">
                  <img src={partner.image} alt={partner.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-gray-900">{partner.title}</h3>
                  <p className="mt-2 text-base text-gray-600">{partner.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}