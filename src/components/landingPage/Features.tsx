// src/components/landingPage/Features.tsx
import { motion } from "framer-motion";
import { 
  ClipboardCheck, 
  DollarSign, 
  CheckCircle, 
  Printer, 
  Package, 
  Smartphone,
  ArrowRightCircle // A subtle icon for the highlighted card
} from "lucide-react";
import React, { useState } from "react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Quickly surface the right content",
    description: "Your customers get relevant results to find precisely what they're looking for.",
  },
  {
    icon: DollarSign,
    title: "Understand user intent",
    description: "AI algorithms predict and show results from the most likely category of content.",
  },
  {
    icon: CheckCircle,
    title: "Stay on top of trends",
    description: "See how customers are interacting with your content to improve user experience.",
  },
  {
    icon: Package,
    title: "Personalize for more engagement",
    description: "Build unique visitor journeys that lead your customers to convert over and over again.",
  },
  {
    icon: Printer,
    title: "Create buying urgency",
    description: "Our AI is always learning what drives conversion and re-ranks content.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Features() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  return (
    <section id="features" className="relative bg-white py-24 sm:py-32 overflow-hidden">
      {/* Background Image & Gradient */}
      <div className="absolute top-0 left-0 w-full h-3/4">
        <img
          src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="A smiling professional working on a laptop in a bright office"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/80 to-white"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="max-w-2xl ml-auto text-left lg:text-right mb-20">
          <motion.h2
            className="text-4xl lg:text-5xl font-bold tracking-tighter text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            Solutions that fulfill your business goals
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Here are just some of the ways Billzzy provides value from day 1.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {features.map((feature) => (
            <motion.div
            key={feature.title}
            className="group relative p-6 rounded-lg cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-200/80 shadow-lg shadow-gray-500/5"
            variants={itemVariants}
            whileHover={{ 
              y: -5,
              scale: 1.03,
              boxShadow: "0 10px 30px -5px rgba(129, 140, 248, 0.2)",
              backgroundColor: "rgba(255, 255, 255, 1)" // Make it fully opaque on hover
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Icon */}
            <div className="mb-4 w-10 h-10 flex items-center justify-center rounded-md bg-white text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors duration-300">
              <feature.icon className="w-5 h-5" />
            </div>
            
            {/* Title */}
            <h3 className="text-base font-semibold mb-2 text-gray-800 group-hover:text-indigo-700 transition-colors duration-300">
              {feature.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}