'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const success = searchParams?.get('success');
    const refresh = searchParams?.get('refresh');

    if (success === 'true') {
      setMessage('Your Stripe account setup was successful! You can now manage your payments.');
    } else if (refresh === 'true') {
      setMessage('Please complete your Stripe account setup. If you closed the window, check your email for the setup link.');
    }

    setLoading(false);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-market-olive mb-6">Vendor Dashboard</h1>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <>
              {message && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
                  {message}
                </div>
              )}
              
              <div className="prose max-w-none">
                <p>Welcome to your vendor dashboard for Flow Farmers Market!</p>
                
                <p className="mt-4">
                  Manage your vendor account and track your market activity using the features below:
                </p>
              </div>
              
              {/* Dashboard Navigation Cards */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/vendor-dashboard/payments" 
                  className="block p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-market-green p-3 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Payment Analytics</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        View your payment history, transaction activity, and sales performance over time.
                      </p>
                    </div>
                  </div>
                </Link>
                
                <div className="block p-6 bg-gray-50 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-gray-300 p-3 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Update your business information and manage your vendor profile. <span className="text-xs text-gray-400">(Coming Soon)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <Link 
                  href="/"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-market-green hover:bg-market-green/90"
                >
                  Return to Home Page
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 