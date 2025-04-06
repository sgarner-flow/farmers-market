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
import ChatbotSidebar from '@/components/ChatbotSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

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
    <div className="relative w-full min-h-screen bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        <div className="md:col-span-2 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="bg-[#F3EDDF] rounded-lg p-6 mb-8 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-gray-800">Vendor Payments Dashboard</h1>
          </div>
          
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            {/* Date selection UI */}
            <div className="grid md:grid-cols-3 gap-4 items-center">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E6D5BC] focus:ring-[#E6D5BC] sm:text-sm"
                />
              </div>
              
              <div>
                <button
                  onClick={() => fetchPaymentData(selectedDate, 1)}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-800 bg-[#F3EDDF] hover:bg-[#E6D5BC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E6D5BC]"
                >
                  {loading ? (
                    <>
                      <span className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800"></span>
                      Loading...
                    </>
                  ) : (
                    'Load Data'
                  )}
                </button>
              </div>
              
              <div>
                <button
                  onClick={() => setShowLookupForm(!showLookupForm)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-[#E6D5BC] text-sm font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E6D5BC]"
                >
                  {showLookupForm ? 'Hide Lookup' : 'Look Up Specific Transaction'}
                </button>
              </div>
            </div>

            {/* Lookup form */}
            {showLookupForm && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Look Up Specific Transaction</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
                      Stripe Account ID (optional)
                    </label>
                    <input
                      type="text"
                      id="accountId"
                      name="accountId"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="acct_1234..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E6D5BC] focus:ring-[#E6D5BC] sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="paymentId" className="block text-sm font-medium text-gray-700">
                      Payment ID (optional)
                    </label>
                    <input
                      type="text"
                      id="paymentId"
                      name="paymentId"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                      placeholder="pi_1234..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E6D5BC] focus:ring-[#E6D5BC] sm:text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleLookup}
                      disabled={loading}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-800 bg-[#F3EDDF] hover:bg-[#E6D5BC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E6D5BC]"
                    >
                      Look Up
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6D5BC]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          ) : (
            <>
              {directPaymentResult && (
                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Payment ID</p>
                      <p className="text-lg font-medium">{directPaymentResult.id}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="text-lg font-medium">{formatCurrency(directPaymentResult.amount)}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        directPaymentResult.status === 'succeeded' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {directPaymentResult.status}
                      </span>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="text-lg font-medium">{new Date(directPaymentResult.created).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor cards */}
              <div className="space-y-6">
                {vendorsToDisplay.map((vendor) => (
                  <div key={vendor.vendor.id} className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{vendor.vendor.business_name}</h2>
                          <p className="text-sm text-gray-500">
                            {vendor.vendor.product_type} | {vendor.vendor.email}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.vendor.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {vendor.vendor.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Render vendor data only if they have transactions */}
                    {vendor.summary.transaction_count > 0 && (
                      <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Total Volume</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(vendor.summary.total_volume)}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Transactions</p>
                            <p className="text-2xl font-bold text-gray-900">{vendor.summary.transaction_count}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Avg. Transaction</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(vendor.summary.average_transaction_size)}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Available Balance</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(vendor.summary.available_balance)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Pending: {formatCurrency(vendor.summary.pending_balance)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Transaction Charts */}
                        <div className="p-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Transaction Volume</h3>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={vendor.hourly_data}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="hour" 
                                  tickFormatter={formatHour}
                                  tick={{ fontSize: 12 }}
                                />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip 
                                  formatter={(value: ValueType, name: NameType) => {
                                    if (name === 'volume') return [formatCurrency(value as number), 'Volume'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `Hour: ${formatHour(label as number)}`}
                                />
                                <Legend />
                                <Bar dataKey="count" fill="#8884d8" name="Transaction Count" yAxisId="left" />
                                <Bar dataKey="volume" fill="#82ca9d" name="Volume ($)" yAxisId="right" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        {/* Recent Transactions Table */}
                        {vendor.recent_transactions && vendor.recent_transactions.length > 0 && (
                          <div className="p-4 border-t">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Transaction ID
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Amount
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Method
                                    </th>
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
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMorePages && (
                <div className="text-center mb-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-800 bg-[#F3EDDF] hover:bg-[#E6D5BC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E6D5BC]"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800"></span>
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
        
        {/* Chatbot Column */}
        <div className="md:col-span-1 bg-white">
          <div className="h-full border-l border-gray-200">
            <ChatbotSidebar />
          </div>
        </div>
      </div>
    </div>
  );
} 