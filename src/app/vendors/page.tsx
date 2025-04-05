import { createServerClient } from '@/lib/supabase';

export default async function VendorsPage() {
  const supabase = createServerClient();
  
  // Get all approved vendors
  const { data: vendors, error } = await supabase
    .from('vendor_applications')
    .select('*')
    .eq('status', 'approved')
    .order('business_name', { ascending: true });

  if (error) {
    console.error('Error fetching vendors:', error);
    return (
      <div className="min-h-screen bg-green-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-green-900 mb-8">
            Our Vendors
          </h1>
          <p className="text-red-600">Error loading vendors. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-900 mb-4">
            Our Market Vendors
          </h1>
          <p className="text-xl text-gray-600">
            Meet the local farmers and artisans who make our market special
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vendors?.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-2">
                  {vendor.business_name}
                </h2>
                <div className="mb-4">
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {vendor.product_type}
                  </span>
                </div>
                <div className="space-y-2 text-gray-600">
                  {vendor.locally_sourced === 'Yes' && (
                    <p className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Locally Sourced
                    </p>
                  )}
                  {vendor.organic_pesticide_free === 'Yes' && (
                    <p className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Organic/Pesticide-Free
                    </p>
                  )}
                  {vendor.eco_friendly_packaging === 'Yes' && (
                    <p className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Eco-Friendly Packaging
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {vendors?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No vendors are currently scheduled for the upcoming market.
              Please check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 