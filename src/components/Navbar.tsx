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
  const pathname = usePathname();
  
  // Check if we're on the homepage
  const isHomePage = pathname === "/";

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <nav 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${navBgStyle}`}
    >
      <div className="container mx-auto flex items-center justify-center py-4 px-4">
        {isHomePage ? (
          // Show regular navigation on homepage
          <>
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('about')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('details')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
              >
                Market Details
              </button>
              <button 
                onClick={() => scrollToSection('vendors')}
                className="text-white hover:text-gray-200 transition-colors font-medium"
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
              >
                Apply to Vend
              </button>
            </div>
            <div className="md:hidden">
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
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        ) : (
          // Show minimal navigation on other pages
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-market-brown hover:text-market-green transition-colors">
              <Button variant="ghost" className="text-market-brown">
                Back to Homepage
              </Button>
            </Link>
            
            {pathname !== "/market-map" && (
              <Link href="/market-map" className="text-market-brown hover:text-market-green transition-colors">
                <Button variant="ghost" className="text-market-brown">
                  Market Map
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
