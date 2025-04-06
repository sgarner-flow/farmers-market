import { Mail, Instagram, Facebook, Twitter } from "lucide-react";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-market-olive text-white py-12">
      <div className="site-container">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <p className="text-xl font-medium font-display mb-4">Flow Farmers Market</p>
            <p className="text-sm mb-4">
              Bringing fresh, local food to the heart of Miami every Sunday.
            </p>
            <p className="text-xs opacity-75">
              Supporting local farmers and artisans
            </p>
          </div>
          
          <div>
            <p className="text-xl font-medium font-display mb-4">Contact Us</p>
            <div className="space-y-2 text-sm">
              <a href="mailto:info@flowmarket.com" className="flex items-center hover:underline">
                <Mail className="h-5 w-5 mr-2" />
                info@flowmarket.com
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                <Instagram className="h-5 w-5 mr-2" />
                @flowfarmersmarket
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                <Facebook className="h-5 w-5 mr-2" />
                Flow Farmers Market
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                <Twitter className="h-5 w-5 mr-2" />
                @flowmarket
              </a>
            </div>
          </div>
          
          <div>
            <p className="text-xl font-medium font-display mb-4">Hours & Location</p>
            <p className="text-sm">
              Every Sunday, 10AM - 3PM<br />
              Flow Miami - Downtown Promenade<br />
              698 NE 1st Avenue<br />
              Miami, FL 33132
            </p>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-xs opacity-75">
          <p>© {new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 