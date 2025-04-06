import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vendor Dashboard | Flow Farmers Market',
  description: 'Access your vendor account and manage your Flow Farmers Market presence',
};

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-[#F3EDDF] text-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center flex-shrink-0 mr-4">
              <Link href="/" className="text-xl font-bold hover:text-gray-600 whitespace-nowrap">Flow Farmers Market</Link>
              <span className="ml-4 text-sm bg-[#E6D5BC] px-2 py-1 rounded whitespace-nowrap">Vendor Portal</span>
            </div>
            <nav className="flex-shrink-0 ml-4">
              <Link 
                href="/vendor-dashboard/payments" 
                className="px-4 py-2 rounded-md text-sm font-medium bg-[#E6D5BC] hover:bg-[#D8C5A9] transition-colors whitespace-nowrap"
              >
                Payments
              </Link>
            </nav>
          </div>
        </div>
      </header>
      
      <main>
        {children}
      </main>
      
      <footer className="bg-white border-t mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Flow Farmers Market. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 