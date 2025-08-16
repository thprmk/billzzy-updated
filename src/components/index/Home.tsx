// src/components/landingPage/Home.tsx
'use client';
import React from 'react';
import Navbar from '../landingPage/Navbar';
import Hero from '../landingPage/Hero';
import Features from '../landingPage/Features';
import FeatureImage from '../landingPage/Feature_img';
import UseCases from '../landingPage/UseCase';
import Pricing from '../landingPage/Pricing';
import Faq from '../landingPage/Faq';
import Contact from '../landingPage/Contact';
import Footer from '../landingPage/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      
      <section id="features" className="scroll-mt-20">
        <Features />
      </section>

      <FeatureImage />

      <section id="usecase" className="scroll-mt-20">
        <UseCases />
      </section>

      <section id="pricing" className="scroll-mt-20">
        <Pricing />
      </section>
      
      <section id="faq" className="scroll-mt-20">
        <Faq />
      </section>

      <section id="contact" className="scroll-mt-20">
        <Contact />
      </section>
      
      <Footer />
    </div>
  );
}