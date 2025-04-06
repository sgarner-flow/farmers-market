'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on the homepage
  const isHomePage = pathname === "/";

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    // Close mobile menu after selection
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
      
      // Set scrolled state for background transition
      setScrolled(currentScrollPos > 50);
      
      setPrevScrollPos(currentScrollPos);
      setVisible(isVisible);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  // Background styles based on scrolled state - transparent like in the Figma
  const navBgStyle = scrolled ? 'bg-black/30 backdrop-blur-sm' : 'bg-transparent';
  
  // For non-homepage pages, use a different background
  const nonHomePageBg = 'bg-[#F3EDDF] shadow-sm';

  return (
    <nav 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${isHomePage ? navBgStyle : nonHomePageBg}`}
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        {isHomePage ? (
          // Show regular navigation on homepage
          <>
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('about')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
                data-lpignore="true"
                type="button"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('details')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
                data-lpignore="true"
                type="button"
              >
                Market Details
              </button>
              <button 
                onClick={() => scrollToSection('vendors')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
                data-lpignore="true"
                type="button"
              >
                Our Vendors
              </button>
              <Link
                href="/market-map"
                className="text-white hover:text-gray-200 transition-colors font-medium"
              >
                Market Map
              </Link>
              <button 
                onClick={() => scrollToSection('apply')}
                className="border border-white text-white hover:bg-white hover:text-market-green transition-colors px-5 py-2 rounded-md font-medium"
                data-lpignore="true"
                type="button"
              >
                Apply to Vend
              </button>
            </div>
            <div className="md:hidden flex justify-between w-full">
              <div className="flex space-x-4">
                <Link
                  href="/market-map"
                  className="text-white hover:text-gray-200 transition-colors font-medium"
                >
                  Map
                </Link>
                <button
                  onClick={() => scrollToSection('apply')}
                  className="border border-white text-white hover:bg-white hover:text-market-green transition-colors px-4 py-2 rounded-md font-medium"
                  data-lpignore="true"
                  type="button"
                >
                  Apply
                </button>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2"
                data-lpignore="true"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
            
            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden absolute top-16 left-0 right-0 bg-black/90 backdrop-blur-sm p-4 flex flex-col space-y-4">
                <button 
                  onClick={() => scrollToSection('about')}
                  className="text-white hover:text-gray-200 transition-colors font-medium text-left px-4 py-2"
                  data-lpignore="true"
                  type="button"
                >
                  About
                </button>
                <button 
                  onClick={() => scrollToSection('details')}
                  className="text-white hover:text-gray-200 transition-colors font-medium text-left px-4 py-2"
                  data-lpignore="true"
                  type="button"
                >
                  Market Details
                </button>
                <button 
                  onClick={() => scrollToSection('vendors')}
                  className="text-white hover:text-gray-200 transition-colors font-medium text-left px-4 py-2"
                  data-lpignore="true"
                  type="button"
                >
                  Our Vendors
                </button>
              </div>
            )}
          </>
        ) : (
          // Consistent navigation for all non-homepage pages
          <div className="flex items-center justify-between w-full">
            <Link href="/" className="flex items-center text-market-brown hover:text-market-green transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Back to Homepage</span>
              <span className="sm:hidden">Back</span>
            </Link>
            
            {/* Page title - centered */}
            <h2 className="text-lg sm:text-xl font-medium text-market-brown">
              {pathname === "/market-map" && "Vendor Map"}
              {pathname === "/apply-to-vend" && "Vendor Application"}
              {pathname === "/vendors" && "Browse Vendors"}
              {/* Add other page titles as needed */}
            </h2>
            
            {/* Right side navigation options */}
            <div className="flex space-x-2">
              {pathname !== "/market-map" && (
                <Link 
                  href="/market-map" 
                  className="text-sm px-3 py-1 rounded-md border border-market-green text-market-green hover:bg-market-green hover:text-white transition-colors"
                >
                  Market Map
                </Link>
              )}
              {pathname !== "/apply-to-vend" && (
                <Link 
                  href="/apply-to-vend" 
                  className="text-sm px-3 py-1 rounded-md border border-market-green text-market-green hover:bg-market-green hover:text-white transition-colors"
                >
                  Apply
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
