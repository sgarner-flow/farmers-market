"use client"

import { useEffect, useState } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === "undefined") {
      return;
    }

    // Initial check
    const checkIfMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };

    // Set initial value
    checkIfMobile();

    // Add event listener for window resize
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleResize = () => checkIfMobile();
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleResize);
    } else {
      // For older browsers
      window.addEventListener("resize", handleResize);
    }

    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  return isMobile;
} 