'use client';

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import MarketDetailsSection from '@/components/MarketDetailsSection';
import VendorsSection from '@/components/VendorsSection';
import ApplicationSection from '@/components/ApplicationSection';
import Footer from '@/components/Footer';
import NewsletterSignup from '@/components/NewsletterSignup';
import { useState } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <AboutSection />
        <MarketDetailsSection />
        <VendorsSection />
        <ApplicationSection />
        
        {/* Newsletter Section - preserving from original site */}
        <section id="newsletter" className="py-16 bg-market-cream scroll-mt-16">
          <div className="site-container">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-medium text-market-brown mb-4 uppercase">
                Stay Connected
              </h2>
              <div className="w-20 h-1 bg-market-orange mx-auto mb-8"></div>
              <p className="text-lg text-market-olive mb-8">
                Get weekly updates about vendors, seasonal produce, and special events
              </p>
            </div>
            <NewsletterSignup />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
