'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Check for authentication on mount
  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple password check - in a real app, use a proper auth system
    if (password === 'flowlife123') {
      localStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-market-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
          
          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-market-green focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-market-green text-white py-2 px-4 rounded-md hover:bg-market-green/90 focus:outline-none focus:ring-2 focus:ring-market-green/50"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Navigation links
  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/vendors', label: 'Vendors' },
    { href: '/admin/vendor-invites', label: 'Vendor Invites' },
    { href: '/admin/mailing-list', label: 'Mailing List' },
    { href: '/vendor-dashboard/payments', label: 'Payments' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-[#F3EDDF] border-b border-[#E9DFC9] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link 
                href="/admin" 
                className="text-market-olive"
              >
                <h1 className="text-2xl">Flow Market Admin</h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="text-market-olive hover:text-market-green text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <div className="bg-[#F3EDDF] border-b border-[#E9DFC9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 py-3 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-market-green text-white'
                    : 'text-market-olive hover:bg-[#E9DFC9] hover:text-market-olive'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
} 