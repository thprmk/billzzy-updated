// src/components/landingPage/Faq.tsx
'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Phone } from "lucide-react";
import Link from "next/link";

// Define the TypeScript type for an FAQ item
type FaqItem = {
  id: number;
  question: string;
  answer: string;
};

const faqData: FaqItem[] = [
  // ... (Your faqData array remains the same)
  {
    id: 1,
    question: "Who is Billzzy for?",
    answer: "Billzzy is perfect for small business owners, especially those running boutiques, online stores, or shops that need a simple way to create bills, track inventory, and manage sales. If you're tired of doing everything manually, Billzzy is for you.",
  },
  {
    id: 2,
    question: "Is it difficult to get started?",
    answer: "Not at all! You can sign up and create your first bill in just a few minutes. The design is simple and intuitive, so you don't need any technical knowledge to start managing your business more efficiently.",
  },
  {
    id: 3,
    question: "Can I manage products with different sizes and colors?",
    answer: "Yes! This is one of our key features. Billzzy fully supports products with variants like different sizes, colors, or styles. Each variant has its own stock count, so your inventory is always accurate.",
  },
  {
    id: 4,
    question: "Is my data safe with Billzzy?",
    answer: "Absolutely. Your business data is very important to us. We use secure cloud infrastructure (AWS) and standard encryption practices to ensure your customer, product, and sales information is always kept safe and private.",
  },
];

// Define the props for the AccordionItem component
type AccordionItemProps = {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
};

const AccordionItem = ({ item, isOpen, onToggle }: AccordionItemProps) => {
  return (
    <div className="border-b border-gray-200 py-6">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center text-left gap-4"
      >
        <h3 className="text-base sm:text-lg font-medium text-gray-900">{item.question}</h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="text-base text-gray-600 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default function Faq() {
  const [openId, setOpenId] = useState<number | null>(null);

  const handleToggle = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 sm:py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
          {/* Left Side: Header */}
          <div className="lg:col-span-1 text-center lg:text-left">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-600">
                Can't find the answer you're looking for? Reach out to our customer support team.
              </p>
              <a href="tel:7339249430" className="mt-8 inline-block">
                <button className="inline-flex items-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold text-base transition-all duration-300 hover:bg-indigo-700 hover:scale-105">
                  <Phone className="w-4 h-4" />
                   7339249430
                </button>
              </a>
            </div>
          </div>

          {/* Right Side: Accordion */}
          <div className="lg:col-span-2">
            {faqData.map((item) => (
              <AccordionItem 
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}