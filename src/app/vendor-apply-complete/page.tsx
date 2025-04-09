'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function VendorApplyCompleteContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string>('');
  
  useEffect(() => {
    const success = searchParams?.get('success');
    
    if (success === 'true') {
      setMessage('Congratulations! Your Stripe account setup is complete. You are now ready to participate in the Flow Farmers Market!');
    } else {
      setMessage('Thank you for applying to be a vendor at Flow Farmers Market. Please check your email for next steps.');
    }
  }, [searchParams]);

  return (
    <div className="max-w-4xl mx-auto p-6 py-16">
      <div className="text-center mb-10">
        <Image
          src="/Flow-Header.png"
          alt="Flow Farmers Market"
          width={300}
          height={110}
          priority
          className="mx-auto mb-6"
        />
        <h1 className="text-3xl font-roughwell text-olive mb-2">Application Complete</h1>
        <div className="max-w-2xl mx-auto">
          <p className="text-xl mb-6 text-olive-dark">{message}</p>
          
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-gen1970 text-olive mb-4">What's Next?</h2>
            <ul className="text-left space-y-4">
              <li className="flex items-start">
                <span className="text-olive-dark font-bold mr-2">•</span>
                <span>Our team will be in touch with you regarding your first market day.</span>
              </li>
              <li className="flex items-start">
                <span className="text-olive-dark font-bold mr-2">•</span>
                <span>Make sure to check your email regularly for important updates and information.</span>
              </li>
              <li className="flex items-start">
                <span className="text-olive-dark font-bold mr-2">•</span>
                <span>You'll receive details about your tent assignment and setup instructions before the market day.</span>
              </li>
            </ul>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Link 
              href="/vendor-dashboard" 
              className="px-6 py-3 bg-olive hover:bg-olive-dark text-white rounded-md transition-colors">
              Go to Vendor Dashboard
            </Link>
            <Link 
              href="/" 
              className="px-6 py-3 bg-beige hover:bg-beige-dark text-olive border border-olive rounded-md transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-16 text-center">
      <div className="mx-auto mb-6 h-[110px] w-[300px] bg-gray-200 animate-pulse rounded"></div>
      <div className="h-10 bg-gray-200 max-w-md mx-auto mb-6 animate-pulse rounded"></div>
      <div className="h-6 bg-gray-200 max-w-lg mx-auto mb-10 animate-pulse rounded"></div>
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="h-8 bg-gray-200 max-w-xs mx-auto mb-6 animate-pulse rounded"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-gray-200 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VendorApplyComplete() {
  return (
    <div className="min-h-screen bg-beige-light">
      <Suspense fallback={<LoadingFallback />}>
        <VendorApplyCompleteContent />
      </Suspense>
    </div>
  );
} 