import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-green-800 text-white">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Flow Farmers Market
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/vendors"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Browse Vendors
            </Link>
            {/* ... other navigation items ... */}
          </div>
        </div>
      </nav>
    </header>
  );
} 