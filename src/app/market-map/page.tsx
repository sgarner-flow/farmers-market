'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type VendorApplication = Database['public']['Tables']['vendor_applications']['Row'];

// Define location addresses and coordinates for each market
const marketLocations = {
  Miami: {
    address: "698 NE 1st Avenue, Miami, FL 33132",
    name: "Flow Miami - Downtown Promenade",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3592.6985921046396!2d-80.18967668496555!3d25.781397583636264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b6a01f47f72b%3A0xa6553d9d330353b8!2s698%20NE%201st%20Ave%2C%20Miami%2C%20FL%2033132!5e0!3m2!1sen!2sus!4v1650301246972!5m2!1sen!2sus"
  },
  FLL: {
    address: "501 SE 17th Street, Fort Lauderdale, FL 33316",
    name: "Flow FLL - Las Olas Market",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.202743392616!2d-80.13862388495793!3d26.100446983486868!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d901a1d8321de5%3A0x9d0a484e1bd93a36!2s501%20SE%2017th%20St%2C%20Fort%20Lauderdale%2C%20FL%2033316!5e0!3m2!1sen!2sus!4v1650301323426!5m2!1sen!2sus"
  },
  Brickell: {
    address: "901 S Miami Avenue, Miami, FL 33130",
    name: "Flow Brickell - Waterfront Plaza",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3593.1387864009566!2d-80.19392568496586!3d25.766357983644626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b7c3a4a4d01f%3A0xd5d0af45114bd9b9!2s901%20S%20Miami%20Ave%2C%20Miami%2C%20FL%2033130!5e0!3m2!1sen!2sus!4v1650301383472!5m2!1sen!2sus"
  },
  Aventura: {
    address: "19501 Biscayne Blvd, Aventura, FL 33180",
    name: "Flow Aventura - Mall Courtyard",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3583.0551822772134!2d-80.14603188495969!3d26.03811348360057!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9acf1ee9507d5%3A0x731e59717a05a2!2s19501%20Biscayne%20Blvd%2C%20Aventura%2C%20FL%2033180!5e0!3m2!1sen!2sus!4v1650301438761!5m2!1sen!2sus"
  },
  "El Portal": {
    address: "500 NE 87th Street, El Portal, FL 33138",
    name: "Flow El Portal - Community Square",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3590.2018633183647!2d-80.18769688496406!3d25.85000008361108!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b1f2c8567f85%3A0x9956c9724c87d992!2s500%20NE%2087th%20St%2C%20El%20Portal%2C%20FL%2033138!5e0!3m2!1sen!2sus!4v1650301491762!5m2!1sen!2sus"
  },
  Granada: {
    address: "200 Anastasia Avenue, Coral Gables, FL 33134",
    name: "Flow Granada - Fountain Plaza",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3593.5687855257566!2d-80.27392128496613!3d25.75133658365178!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b7e77d488513%3A0x3e17cf86095b6ca1!2s200%20Anastasia%20Ave%2C%20Coral%20Gables%2C%20FL%2033134!5e0!3m2!1sen!2sus!4v1650301535762!5m2!1sen!2sus"
  }
};

export default function MarketMapPage() {
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<string>('Miami');
  
  useEffect(() => {
    // Check URL params for location on initial load
    const searchParams = new URLSearchParams(window.location.search);
    const locationParam = searchParams.get('location');
    if (locationParam) {
      setLocation(locationParam);
    }
    
    // Only check the URL params on initial mount, not when location changes
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // Separate useEffect for fetching vendors when location changes
  useEffect(() => {
    async function fetchVendors() {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('*')
        .eq('status', 'approved')
        .order('business_name');
        
      if (!error && data) {
        setVendors(data);
      } else {
        console.error('Error fetching vendors:', error);
      }
      
      setIsLoading(false);
    }
    
    fetchVendors();
  }, [location]);

  // When location changes, update the URL parameter without triggering the first useEffect
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('location', location);
    // Use replaceState instead of pushState to avoid adding to browser history for each change
    window.history.replaceState({}, '', url);
  }, [location]);
  
  // Filter vendors by location if needed
  const vendorsByLocation = vendors.filter(vendor => 
    !vendor.location || vendor.location === location
  );
  
  // Assign vendors to tent positions (simple mapping for now)
  const getTentVendors = () => {
    const tentAssignments: { [key: string]: VendorApplication | null } = {};
    
    // Initialize all tents as empty
    for (let i = 1; i <= 16; i++) {
      tentAssignments[`tent-${i}`] = null;
    }
    
    // Assign vendors to tents (skip positions 1 and 9 which are facilities)
    let vendorIndex = 0;
    for (let i = 1; i <= 16; i++) {
      // Skip positions 1 and 9 (first positions in top and bottom rows)
      if (i !== 1 && i !== 9) {
        if (vendorIndex < vendorsByLocation.length) {
          tentAssignments[`tent-${i}`] = vendorsByLocation[vendorIndex];
          vendorIndex++;
        }
      }
    }
    
    return tentAssignments;
  };
  
  const tentVendors = getTentVendors();
  const currentMarket = marketLocations[location as keyof typeof marketLocations];
  
  return (
    <main className="min-h-screen bg-[#F3EDDF] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title only - removed the back button */}
        <div className="flex justify-center mb-8">
          <h1 className="text-4xl text-market-brown">VENDOR MAP</h1>
        </div>
        
        {/* Google Maps Location */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-8">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 mb-4 md:mb-0 md:pr-6">
              <h2 className="text-2xl font-semibold text-market-brown mb-2">{currentMarket.name}</h2>
              <p className="text-market-olive mb-4">{currentMarket.address}</p>
              
              <div className="bg-market-green/10 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-market-green mb-2">Market Day</h3>
                <p className="text-market-olive">Every Sunday, 10:00am–3:00pm</p>
              </div>
              
              <div className="bg-market-brown/10 rounded-lg p-4">
                <h3 className="font-medium text-market-brown mb-2">Vendor Schedule</h3>
                <p className="text-market-olive">Load-in: 8:00–10:00am</p>
                <p className="text-market-olive">Load-out: 3:00–5:00pm</p>
              </div>
              
              {/* Directions button */}
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(currentMarket.address)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-6 inline-block bg-market-green text-white px-4 py-2 rounded-md hover:bg-market-green/90 transition-colors"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Get Directions
                </div>
              </a>
            </div>
            
            <div className="md:w-2/3">
              <div className="relative h-0 pb-[56.25%]">
                <iframe 
                  src={currentMarket.mapUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${currentMarket.name}`}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Map container with legend */}
        <div className="bg-[#F1E9D6] p-6 rounded-lg relative mb-8">
          {/* Vendor Map header with integrated elements */}
          <div className="flex flex-wrap items-center justify-between mb-4">
            {/* Left side: Title and date */}
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-market-brown">Vendor Map</h2>
              <div className="text-market-olive text-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span>Last updated: {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).replace(/\//g, '/')}</span>
              </div>
            </div>

            {/* Right side: Location selector */}
            <div className="flex items-center space-x-3">
              <label htmlFor="location-select" className="font-medium text-market-brown whitespace-nowrap">
                Market Location:
              </label>
              <select
                id="location-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-3 py-1 border border-market-green/30 rounded-lg focus:ring-2 focus:ring-market-green focus:border-market-green"
              >
                <option value="Miami">Miami</option>
                <option value="FLL">FLL</option>
                <option value="Brickell">Brickell</option>
                <option value="Aventura">Aventura</option>
                <option value="El Portal">El Portal</option>
                <option value="Granada">Granada</option>
              </select>
            </div>
          </div>

          {/* Legend - integrated into a horizontal layout */}
          <div className="bg-white p-3 rounded-lg shadow-sm inline-flex items-center mb-6">
            <span className="text-market-brown font-medium mr-4">Legend:</span>
            <div className="flex items-center mr-4">
              <div className="w-4 h-4 border-2 border-market-brown bg-white mr-2"></div>
              <span className="text-sm">Vendor Tent</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-market-brown bg-[#F3EDDF] mr-2"></div>
              <span className="text-sm">Facility/Service</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">Loading vendor map...</div>
          ) : (
            <>
              {/* Top Row Tents */}
              <div className="mb-8">
                <div className="inline-block bg-white px-6 py-2 rounded-full mb-4">
                  <h2 className="font-medium text-market-brown text-lg m-0">Top Row Tents</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  {/* First tent is always Vendor Parking */}
                  <div className="bg-[#F3EDDF] border-2 border-market-brown rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center group relative hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                    <div className="mb-1">
                      <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                      </svg>
                    </div>
                    <div className="font-medium">Vendor</div>
                    <div className="font-medium">Parking</div>
                    <div className="text-xs text-market-olive">&amp; Load-in</div>
                    
                    {/* Tooltip */}
                    <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                      <h3 className="font-bold text-market-brown">Vendor Parking &amp; Load-in</h3>
                      <p className="text-sm text-market-olive mt-1">Reserved parking area for vendors to unload their products and supplies.</p>
                      {/* Arrow pointer */}
                      <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                    </div>
                  </div>
                  
                  {/* Dynamic vendors from top row (tents 2-8) */}
                  {Array.from({length: 7}, (_, i) => i + 2).map((tentNum) => {
                    const vendor = tentVendors[`tent-${tentNum}`];
                    return (
                      <div 
                        key={`tent-${tentNum}`} 
                        className={`border-2 border-market-brown rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center group relative hover:shadow-lg hover:scale-105 transition-all cursor-pointer ${vendor ? 'bg-white' : 'bg-white'}`}
                      >
                        {vendor ? (
                          <>
                            <div className="font-medium">{vendor.business_name.split(' ').slice(0, 1).join(' ')}</div>
                            <div className="font-medium">{vendor.business_name.split(' ').slice(1).join(' ')}</div>
                            <div className="text-xs text-market-olive mt-1 px-2 py-0.5 bg-[#EBF5E9] rounded-full">
                              {vendor.product_type}
                            </div>
                            
                            {/* Tooltip */}
                            <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                              <h3 className="font-bold text-market-brown">{vendor.business_name}</h3>
                              <p className="text-sm text-market-olive mt-1">{vendor.product_type}</p>
                              {vendor.organic_pesticide_free === 'Yes' && 
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Organic</span>
                              }
                              {vendor.eco_friendly_packaging === 'Yes' && 
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Eco-Friendly</span>
                              }
                              {vendor.locally_sourced === 'Yes' && 
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Local</span>
                              }
                              {/* Arrow pointer */}
                              <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 font-light">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Bottom Row Tents */}
              <div>
                <div className="inline-block bg-white px-6 py-2 rounded-full mb-4">
                  <h2 className="font-medium text-market-brown text-lg m-0">Bottom Row Tents</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
                  {/* First tent in bottom row is always Sanitation */}
                  <div className="bg-[#F3EDDF] border-2 border-market-brown rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center group relative hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                    <div className="mb-1">
                      <svg className="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </div>
                    <div className="font-medium">Sanitation</div>
                    
                    {/* Tooltip */}
                    <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                      <h3 className="font-bold text-market-brown">Sanitation</h3>
                      <p className="text-sm text-market-olive mt-1">Waste disposal and sanitation services for the market.</p>
                      {/* Arrow pointer */}
                      <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                    </div>
                  </div>
                  
                  {/* Dynamic vendors from bottom row (tents 10-16) */}
                  {Array.from({length: 7}, (_, i) => i + 10).map((tentNum) => {
                    const vendor = tentVendors[`tent-${tentNum}`];
                    return (
                      <div 
                        key={`tent-${tentNum}`} 
                        className={`border-2 border-market-brown rounded-lg p-4 text-center min-h-[120px] flex flex-col items-center justify-center group relative hover:shadow-lg hover:scale-105 transition-all cursor-pointer ${vendor ? 'bg-white' : 'bg-white'}`}
                      >
                        {vendor ? (
                          <>
                            <div className="font-medium">{vendor.business_name.split(' ').slice(0, 1).join(' ')}</div>
                            <div className="font-medium">{vendor.business_name.split(' ').slice(1).join(' ')}</div>
                            <div className="text-xs text-market-olive mt-1 px-2 py-0.5 bg-[#EBF5E9] rounded-full">
                              {vendor.product_type}
                            </div>
                            
                            {/* Tooltip */}
                            <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                              <h3 className="font-bold text-market-brown">{vendor.business_name}</h3>
                              <p className="text-sm text-market-olive mt-1">{vendor.product_type}</p>
                              {vendor.organic_pesticide_free === 'Yes' && 
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Organic</span>
                              }
                              {vendor.eco_friendly_packaging === 'Yes' && 
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Eco-Friendly</span>
                              }
                              {vendor.locally_sourced === 'Yes' && 
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full inline-block mr-1 mt-1">Local</span>
                              }
                              {/* Arrow pointer */}
                              <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 font-light">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          
          {/* Avenue label */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-4 origin-center rotate-90 text-market-brown font-bold bg-white px-4 py-2 rounded-full border-2 border-market-brown/50 shadow-md">
            Avenue
          </div>
          
          {/* Move Entrances section here, inside the map container */}
          <h2 className="text-2xl font-medium mt-8 mb-4 text-market-brown">Entrances</h2>
          
          {/* Display entrances in a proper grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-4">
            {/* Flow Station */}
            <div className="md:col-span-5 relative">
              <div className="bg-[#F3EDDF] border-2 border-market-brown rounded-lg p-4 text-center group hover:shadow-lg hover:scale-105 transition-all cursor-pointer relative flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 19h18v2H2v-2zM10 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17h-4v-2.26C8.19 13.47 7 11.38 7 9a7 7 0 0 1 3-5.74V2z" />
                </svg>
                <span>Flow Station Entrance</span>
                
                {/* Tooltip */}
                <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                  <h3 className="font-bold text-market-brown">Flow Station Entrance</h3>
                  <p className="text-sm text-market-olive mt-1">Main entrance near the Flow Station with access to outdoor dining area.</p>
                  {/* Arrow pointer */}
                  <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                </div>
              </div>
            </div>

            {/* Guest Entrance/Exit */}
            <div className="md:col-span-2 relative">
              <div className="bg-[#F3EDDF] border-2 border-market-brown rounded-lg p-4 text-center group hover:shadow-lg hover:scale-105 transition-all cursor-pointer relative">
                <svg className="w-5 h-5 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C9.79 2 8 3.79 8 6s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                </svg>
                <div>Guest Entrance/Exit</div>
                <div className="text-xs">ADA Accessible</div>
                
                {/* Tooltip */}
                <div className="invisible absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-md p-3 shadow-xl border-2 border-market-brown w-64 z-50">
                  <h3 className="font-bold text-market-brown">Guest Entrance/Exit</h3>
                  <p className="text-sm text-market-olive mt-1">Wheelchair accessible entrance and exit for market guests.</p>
                  {/* Arrow pointer */}
                  <div className="absolute left-1/2 bottom-[-10px] transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Map update information */}
        <div className="bg-[#F3EDDF] text-market-olive p-4 rounded-lg inline-block">
          This map is updated weekly with vendor placements.
        </div>
      </div>
    </main>
  );
} 