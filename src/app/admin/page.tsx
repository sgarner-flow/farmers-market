'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingApplications: 0,
    mailingListSize: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch vendor stats
        const { count: totalVendors } = await supabase
          .from('vendor_applications')
          .select('*', { count: 'exact', head: true });

        const { count: pendingApplications } = await supabase
          .from('vendor_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch mailing list stats using the API to get accurate counts
        let mailingListSize = 0;
        try {
          const response = await fetch('/api/getMailingList');
          if (response.ok) {
            const data = await response.json();
            mailingListSize = data.count || 0;
          } else {
            console.error('Failed to fetch mailing list count');
          }
        } catch (mlError) {
          console.error('Error fetching mailing list count:', mlError);
        }

        setStats({
          totalVendors: totalVendors || 0,
          pendingApplications: pendingApplications || 0,
          mailingListSize: mailingListSize,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-white rounded-lg shadow"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-market-olive">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/vendors" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-market-olive mb-2">Vendor Applications</h2>
            <div className="flex justify-between items-baseline">
              <p className="text-3xl font-bold text-market-green">{stats.totalVendors}</p>
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                {stats.pendingApplications} pending
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/admin/mailing-list" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-market-olive mb-2">Mailing List</h2>
            <p className="text-3xl font-bold text-market-green">{stats.mailingListSize}</p>
          </div>
        </Link>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-market-olive mb-2">Quick Actions</h2>
          <div className="space-y-2">
            <Link 
              href="/admin/vendors" 
              className="block w-full py-2 px-3 bg-market-green text-white rounded-md text-center hover:bg-market-olive transition-colors"
            >
              View Vendor Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 