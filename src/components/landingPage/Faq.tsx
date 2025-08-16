// src/components/landingPage/Faq.tsx
'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

// 1. Define the TypeScript type for an FAQ item
type FaqItem = {
  id: number;
  question: string;
  answer: string;
};

const faqData: FaqItem[] = [
  {
    id: 1,
    question: "What is a POS machine and why do I need it?",
    answer: "A Point of Sale (POS) machine is a device used to process transactions in a retail environment. You need it to accept card payments, track sales, manage inventory, and generate reports, which simplifies your business operations.",
  },
  {
    id: 2,
    question: "What if I only have a small shop and don't want to invest much?",
    answer: "Our 'Starter' plan is perfect for small shops. It's completely free and provides all the essential features you need to manage your billing and customers without a significant upfront investment.",
  },
  {
    id: 3,
    question: "How can I get a POS device for my business?",
    answer: "Getting started is easy. Simply sign up for one of our plans, and based on your selection, we can guide you through the process of acquiring a compatible POS device or using our software on your existing Android or iOS devices.",
  },
  {
    id: 4,
    question: "What is an Android POS or Android swipe machine?",
    answer: "An Android POS is a point-of-sale system that runs on the Android operating system, often on a dedicated terminal or a standard tablet/smartphone. It offers flexibility, a user-friendly interface, and access to a wide range of business apps.",
  },
  {
    id: 5,
    question: "Is it possible to use an Android POS terminal with an iOS device?",
    answer: "While the POS terminal itself runs on Android, our cloud-based system allows you to access your dashboard, view reports, and manage your business from any device with a web browser, including your iOS device.",
  },
];

// 2. Define the props for the AccordionItem component
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
        className="w-full flex justify-between items-center text-left"
      >
        <h3 className="text-lg font-medium text-gray-900">{item.question}</h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
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
    <section id="faq" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Left Side: Sticky Header */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Can't find the answer you're looking for? Reach out to our customer support team.
              </p>
              <Link href="/contact" className="mt-8 inline-block">
                <button className="bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold text-base transition-all duration-300 hover:bg-indigo-700 hover:scale-105">
                  Contact Sales
                </button>
              </Link>
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