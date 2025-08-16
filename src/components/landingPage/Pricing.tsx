// src/components/landingPage/Pricing.tsx
'use client';

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started and handling your first orders.",
    features: [
      "Up to 50 Bills per month",
      "Basic Dashboard Analytics",
      "Inventory Management",
      "Customer Management",
    ],
    popular: false,
    cta: "Start for Free",
    href: "/register"
  },
  {
    name: "Pro",
    price: 499,
    description: "For growing businesses that need unlimited scale and power.",
    features: [
      "Unlimited Bills & Invoices",
      "Advanced Dashboard Analytics",
      "Product Variant Support",
      "Order Status SMS Notifications",
      "Priority 24/7 Support",
    ],
    popular: true,
    cta: "Go Pro",
    href: "/register"
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="max-w-4xl mx-auto text-center mb-16 sm:mb-20">
          <motion.h2 
            className="mt-4 text-3xl font-extrabold tracking-tighter text-gray-900 sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p 
            className="mt-6 text-base leading-7 text-gray-600 sm:text-lg sm:leading-8"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
          >
            Choose the plan that's right for your business. No hidden fees.
          </motion.p>
        </div>

        {/* Enhanced Pricing Cards */}
        <div className="isolate mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
            {plans.map((plan, planIndex) => (
              <motion.div
                key={plan.name}
                className={cn(
                  "relative p-8 lg:p-10 rounded-3xl flex flex-col transition-all duration-300 bg-white",
                  plan.popular 
                    ? "shadow-2xl shadow-indigo-900/10 ring-1 ring-gray-900/5" 
                    : "ring-1 ring-gray-200 hover:ring-indigo-300"
                )}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.2 * planIndex, ease: "easeOut" }}
              >
                {plan.popular && (
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-semibold leading-8 text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-base leading-7 text-gray-600">{plan.description}</p>
                
                <div className="mt-6 flex items-baseline gap-x-2">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    {typeof plan.price === 'number' ? `₹${plan.price}` : plan.price}
                  </span>
                  {typeof plan.price === 'number' && (
                    <span className="text-base font-semibold text-gray-500">/month</span>
                  )}
                </div>
                
                {/* Responsive spacing for the feature list */}
                <ul className="mt-8 space-y-3 sm:space-y-4 text-base text-gray-600 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href={plan.href} className="mt-10">
                  <button
                    className={cn(
                      "w-full py-3 px-4 rounded-lg font-semibold text-base lg:text-lg transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
                      plan.popular
                        ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 hover:-translate-y-0.5"
                        : "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                    )}
                  >
                    {plan.cta}
                  </button>
                </Link>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
}