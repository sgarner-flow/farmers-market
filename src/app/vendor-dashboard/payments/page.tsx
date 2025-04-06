'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// Types for the API response
type VendorPaymentData = {
  vendor: {
    id: string;
    business_name: string;
    product_type: string;
    email: string;
    stripe_account_id: string;
    status: string;
  };
  summary: {
    total_volume: number;
    transaction_count: number;
    average_transaction_size: number;
    available_balance: number;
    pending_balance: number;
  };
  hourly_data: {
    hour: number;
    count: number;
    volume: number;
  }[];
  recent_transactions: {
    id: string;
    amount: number;
    status: string;
    created: string;
    payment_method: string;
    receipt_url: string | null;
  }[];
  error?: string;
};

type DirectPaymentResult = {
  id: string;
  amount: number;
  status: string;
  created: string;
  account: string;
};

type ApiResponse = {
  success: boolean;
  date: string;
  vendors: VendorPaymentData[];
  directPaymentResult: DirectPaymentResult | null;
  hasMore: boolean;
  page: number;
  lastAccountId?: string;
  error?: string;
};

// Add a helper function to detect high volume dates
const isHighVolumeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  // April 6th is known to be a high-volume date
  return date.getMonth() === 3 && date.getDate() === 6; // April is month 3 (0-indexed)
};

export default function VendorPaymentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<VendorPaymentData[]>([]);
  const [directPaymentResult, setDirectPaymentResult] = useState<DirectPaymentResult | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [showLookupForm, setShowLookupForm] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [lastAccountId, setLastAccountId] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [allVendors, setAllVendors] = useState<VendorPaymentData[]>([]);

  // In the VendorPaymentsPage component, add a state for showing high-volume warnings
  const [showHighVolumeWarning, setShowHighVolumeWarning] = useState<boolean>(false);

  // Format hour for X-axis display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Sort vendors to ensure those with most transactions appear first, zero transactions at bottom
  const sortVendors = (vendors: VendorPaymentData[]): VendorPaymentData[] => {
    if (!vendors || vendors.length === 0) return [];
    
    return [...vendors].sort((a, b) => {
      // First prioritize vendors with transactions over those with none
      if (a.summary.transaction_count === 0 && b.summary.transaction_count > 0) {
        return 1; // a goes after b
      }
      if (a.summary.transaction_count > 0 && b.summary.transaction_count === 0) {
        return -1; // a goes before b
      }
      // Then sort by total volume for vendors with transactions
      return b.summary.total_volume - a.summary.total_volume;
    });
  };

  // Display sorted payment data
  const vendorsToDisplay = useMemo(() => sortVendors(paymentData), [paymentData]);

  // Fetch payment data for the selected date
  const fetchPaymentData = async (date: string, page: number = 1, account?: string, payment?: string, pageSize: number = 10) => {
    if (page === 1) {
      setLoading(true);
      setPaymentData([]);
      setAllVendors([]);
      setHasMorePages(false);
      setLastAccountId(undefined);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);
    
    try {
      let url = `/api/getVendorPayments?date=${date}&page=${page}&limit=${pageSize}`;
      if (account) url += `&account=${account}`;
      if (payment) url += `&payment=${payment}`;
      if (page > 1 && lastAccountId) url += `&last_account_id=${lastAccountId}`;
      
      // Increase timeout for high-volume dates
      const timeoutMs = isHighVolumeDate(date) ? 60000 : 30000; // 60 seconds for high-volume dates, 30 for normal
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // Add cache-control hints for browsers
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(
            'The request timed out due to high data volume. ' +
            'Try selecting a different date, using a more specific search, ' +
            'or try again later when the system is less busy.'
          );
        }
        
        // Improved error handling for non-JSON responses
        const contentType = response.headers.get('content-type');
        try {
          // If it's JSON, parse it normally
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error (${response.status})`);
          } else {
            // If not JSON, get as text and provide better error
            const errorText = await response.text();
            console.error('Non-JSON error response:', {
              status: response.status,
              contentType,
              responseText: errorText.substring(0, 500) // Log first 500 chars
            });
            throw new Error(`API Error (${response.status}): The server returned an invalid response format. Please try again later.`);
          }
        } catch (parseError) {
          // Handle JSON parsing errors specifically
          if (parseError instanceof SyntaxError) {
            console.error('JSON parsing error:', parseError);
            throw new Error(`Invalid response format from server. Please try again later or contact support.`);
          }
          throw parseError; // Re-throw if it's not a syntax error
        }
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Expected JSON but got:', {
          contentType,
          responsePreview: textResponse.substring(0, 500) // Log first 500 chars
        });
        throw new Error(`Received non-JSON response. The server may be experiencing issues. Please try again later.`);
      }
      
      let data: ApiResponse;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        const textContent = await response.text();
        console.error('Response content:', textContent.substring(0, 500));
        throw new Error('Could not parse server response. Please try again later.');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Error in API response');
      }
      
      // Always make sure we have properly sorted vendor data
      const sortedVendors = sortVendors(data.vendors);
      
      if (page === 1) {
        setPaymentData(sortedVendors);
        setAllVendors(sortedVendors);
      } else {
        // Combine with existing vendors, then sort again to ensure proper order
        const newAllVendors = sortVendors([...allVendors, ...sortedVendors]);
        setPaymentData(newAllVendors);
        setAllVendors(newAllVendors);
      }
      
      setDirectPaymentResult(data.directPaymentResult);
      setHasMorePages(data.hasMore);
      setLastAccountId(data.lastAccountId);
      setCurrentPage(data.page);
    } catch (err) {
      let errorMessage = 'An unknown error occurred';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. The server took too long to respond. Try a different date or a more specific search.';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error('Error fetching payment data:', err);
      setError(errorMessage);
      
      // Keep existing data on error if loading more
      if (page === 1) {
        setPaymentData([]);
        setAllVendors([]);
        setHasMorePages(false);
      }
    } finally {
      if (page === 1) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Handle form submission for looking up specific accounts/payments
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAllVendors([]);
    setLastAccountId(undefined); // Reset pagination state
    
    // Use smaller page size for high-volume dates
    const pageSize = isHighVolumeDate(selectedDate) ? 5 : 10;
    fetchPaymentData(selectedDate, 1, accountId, paymentId, pageSize);
  };
  
  // Handle loading more data
  const handleLoadMore = () => {
    if (isLoadingMore) return; // Prevent multiple simultaneous requests
    
    const pageSize = isHighVolumeDate(selectedDate) ? 5 : 10;
    fetchPaymentData(selectedDate, currentPage + 1, accountId, paymentId, pageSize);
  };

  // Load data when the component mounts or when the selected date changes
  useEffect(() => {
    setCurrentPage(1);
    setAllVendors([]);
    setLastAccountId(undefined); // Reset pagination when date changes
    
    // Check if this is a high-volume date and show a warning
    const isHighVolume = isHighVolumeDate(selectedDate);
    setShowHighVolumeWarning(isHighVolume);
    
    // For high-volume dates, use a smaller page size to improve loading times
    const highVolumePageSize = 5; // Smaller page size for high-volume dates
    const regularPageSize = 10;   // Regular page size for normal dates
    
    fetchPaymentData(selectedDate, 1, accountId, paymentId, isHighVolume ? highVolumePageSize : regularPageSize);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - Redesigned for better alignment */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left side: Title and subtitle */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-market-olive">VENDOR PAYMENTS</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track payment activity for all vendors
              </p>
            </div>
            
            {/* Right side: Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link 
                href="/vendor-dashboard" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-market-green"
              >
                Back to Dashboard
              </Link>
              
              <div className="flex flex-col">
                <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-market-green focus:border-market-green sm:text-sm"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
          
          {/* Search and filters section */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => {
                  setAccountId('');
                  fetchPaymentData(selectedDate, 1);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                View All Accounts
              </button>
            </div>
            
            <button
              onClick={() => setShowLookupForm(!showLookupForm)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Specific Vendor/Payment
            </button>
          </div>
        </div>

        {/* Advanced Lookup Form */}
        {showLookupForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Look Up Specific Payment</h2>
            <form onSubmit={handleLookup} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="account-id" className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Account ID
                </label>
                <input
                  id="account-id"
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="acct_123456789"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-market-green focus:border-market-green sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="payment-id" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Intent ID (optional)
                </label>
                <input
                  id="payment-id"
                  type="text"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  placeholder="pi_123456789"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-market-green focus:border-market-green sm:text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-market-olive hover:bg-market-olive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-market-olive"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Look Up'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-market-green mx-auto"></div>
            <p className="mt-4 text-market-olive">Fetching payment data...</p>
            <p className="mt-2 text-sm text-gray-500">This may take a moment if there are many transactions.</p>
          </div>
        )}

        {/* Error Message */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => fetchPaymentData(selectedDate, 1, accountId, paymentId)}
              className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Direct Payment Result */}
        {directPaymentResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Direct Payment Found</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{directPaymentResult.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(directPaymentResult.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        directPaymentResult.status === 'succeeded' 
                          ? 'bg-green-100 text-green-800' 
                          : directPaymentResult.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : directPaymentResult.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : directPaymentResult.status === 'requires_payment_method' || directPaymentResult.status === 'requires_confirmation'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-100 text-red-800'
                      }`}>
                        {directPaymentResult.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(directPaymentResult.created).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{directPaymentResult.account}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && vendorsToDisplay.length === 0 && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-blue-800">No Payment Data Found</h2>
            <p className="mt-2 text-blue-700">
              {accountId 
                ? `No payments found for account ${accountId} on ${selectedDate}.` 
                : `No vendor payments found for ${selectedDate}.`}
            </p>
            <p className="mt-2 text-sm text-blue-600">
              Try selecting a different date or checking account details.
            </p>
          </div>
        )}

        {/* Payment Data Cards */}
        {!loading && vendorsToDisplay.length > 0 && (
          <>
            <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold text-market-olive">
                Payment Summary - {format(new Date(selectedDate), 'M/d/yyyy')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {vendorsToDisplay.length} vendor{vendorsToDisplay.length !== 1 ? 's' : ''}
                {hasMorePages && ' (more available)'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 mb-8">
              {vendorsToDisplay.map((vendor, index) => (
                <div key={`${vendor.vendor.id || ''}-${index}`} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {vendor.vendor.business_name}
                      {vendor.error && (
                        <span className="ml-2 text-sm text-red-600">
                          (Error: {vendor.error})
                        </span>
                      )}
                    </h3>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
                      <div>Product: {vendor.vendor.product_type}</div>
                      <div>Account: {vendor.vendor.stripe_account_id}</div>
                      <div>Status: {vendor.vendor.status}</div>
                    </div>
                  </div>

                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Total Sales</h4>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(vendor.summary.total_volume)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Transactions</h4>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">{vendor.summary.transaction_count}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Avg. Transaction</h4>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                          {formatCurrency(vendor.summary.average_transaction_size)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Available Balance</h4>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                          {formatCurrency(vendor.summary.available_balance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Pending: {formatCurrency(vendor.summary.pending_balance)}
                        </p>
                      </div>
                    </div>

                    {/* Only show charts and transaction details for vendors with transactions */}
                    {vendor.summary.transaction_count > 0 && (
                      <>
                        {/* Hourly Transaction Chart */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Hourly Sales Volume (9 AM - 9 PM)</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={vendor.hourly_data.filter(data => data.hour >= 9 && data.hour <= 21)} // Filter for 9 AM to 9 PM
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" tickFormatter={formatHour} />
                                <YAxis tickFormatter={(value: number) => `$${Math.round(value)}`} />
                                <Tooltip 
                                  formatter={(value: number | string, name: string) => {
                                    if (name === 'volume') return [formatCurrency(value as number), 'Sales Volume'];
                                    if (name === 'count') return [value, 'Transaction Count'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label: number) => `Hour: ${formatHour(label)}`}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="volume" name="Sales Volume" stroke="#82ca9d" activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="count" name="Transactions" stroke="#8884d8" activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Recent Transactions Table */}
                        {vendor.recent_transactions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-4">Recent Transactions</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {vendor.recent_transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {transaction.receipt_url ? (
                                          <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {transaction.id.substring(0, 10)}...
                                          </a>
                                        ) : (
                                          <span>{transaction.id.substring(0, 10)}...</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatCurrency(transaction.amount)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          transaction.status === 'succeeded' 
                                            ? 'bg-green-100 text-green-800' 
                                            : transaction.status === 'pending' 
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : transaction.status === 'processing'
                                                ? 'bg-blue-100 text-blue-800'
                                                : transaction.status === 'requires_payment_method' || transaction.status === 'requires_confirmation'
                                                  ? 'bg-purple-100 text-purple-800'
                                                  : 'bg-red-100 text-red-800'
                                        }`}>
                                          {transaction.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(transaction.created).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {transaction.payment_method}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Message for vendors with no transactions */}
                    {vendor.summary.transaction_count === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No transactions recorded for this vendor on {format(new Date(selectedDate), 'M/d/yyyy')}.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMorePages && (
              <div className="text-center mb-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-market-olive hover:bg-market-olive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-market-olive"
                >
                  {isLoadingMore ? (
                    <>
                      <span className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Loading more...
                    </>
                  ) : (
                    'Load More Vendors'
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* High-volume date warning component to the JSX */}
        {showHighVolumeWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">High Volume Date Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You've selected April 6th which contains a large volume of transactions. 
                    Loading may take longer and some data might be trimmed for performance.
                    For best results, use specific account lookups or try a different date.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 