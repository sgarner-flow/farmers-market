'use client';

import Button from '@/components/Button';
import Footer from '@/components/Footer';
import Image from 'next/image';
import MailingListSignup from '@/components/MailingListSignup';
import NewsletterSignup from '@/components/NewsletterSignup';
import { useState } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero section */}
      <section className="relative h-[600px] bg-cover bg-center flex items-center justify-center text-white" style={{ backgroundImage: 'url(/hero-bg.jpg)' }}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-6">Flow Farmers Market</h1>
          <p className="text-xl mb-8">Supporting local farmers and artisans in our community</p>
          <div className="space-x-4">
            <button
              onClick={() => {
                const newsletterSection = document.getElementById('newsletter');
                if (newsletterSection) {
                  newsletterSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-block bg-white text-green-800 px-6 py-3 rounded-lg font-semibold hover:bg-green-100 transition-colors"
            >
              Sign up for updates
            </button>
            <a
              href="/vendors"
              className="inline-block bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Browse Vendors
            </a>
            <a
              href="/apply-to-vend"
              className="inline-block bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Apply to Vend
            </a>
          </div>
        </div>
      </section>

      {/* Market Info Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-green-900">Visit Our Market</h2>
            <p className="mt-4 text-xl text-gray-600">
              Every Saturday & Sunday, 8am - 2pm
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Location</h3>
              <p className="text-gray-600">123 Market Street<br />Portland, OR 97201</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Hours</h3>
              <p className="text-gray-600">Saturday & Sunday<br />8:00 AM - 2:00 PM</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Contact</h3>
              <p className="text-gray-600">info@flowmarket.com<br />(503) 555-0123</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Vendors Section */}
      <section className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-green-900">Our Vendors</h2>
            <p className="mt-4 text-xl text-gray-600">
              Meet the local farmers and artisans who make our market special
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Add vendor cards here */}
          </div>
          <div className="text-center mt-12">
            <a
              href="/vendors"
              className="inline-block bg-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              View All Vendors
            </a>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-16 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-green-900">
              Stay Connected
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Get weekly updates about vendors, seasonal produce, and special events
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>

      <Footer />
    </main>
  );
}
