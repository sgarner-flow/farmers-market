import type { Metadata } from 'next';

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
      <header className="bg-market-olive text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Flow Farmers Market</h1>
              <span className="ml-4 text-sm bg-white/20 px-2 py-1 rounded">Vendor Portal</span>
            </div>
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