'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

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
  error?: string;
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

  // Fetch payment data for the selected date
  const fetchPaymentData = async (date: string, account?: string, payment?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/getVendorPayments?date=${date}`;
      if (account) url += `&account=${account}`;
      if (payment) url += `&payment=${payment}`;
      
      const response = await fetch(url);
      const data: ApiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment data');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Error in API response');
      }
      
      setPaymentData(data.vendors);
      setDirectPaymentResult(data.directPaymentResult);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setPaymentData([]);
      setDirectPaymentResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for looking up specific accounts/payments
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPaymentData(selectedDate, accountId, paymentId);
  };

  // Load data when the component mounts or when the selected date changes
  useEffect(() => {
    fetchPaymentData(selectedDate);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-market-olive">Vendor Payments</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track payment activity for all vendors
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
            <Link 
              href="/vendor-dashboard" 
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-market-green"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-market-green focus:border-market-green sm:text-sm"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
        </div>

        {/* Advanced Lookup Form Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowLookupForm(!showLookupForm)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-market-green"
          >
            {showLookupForm ? 'Hide Advanced Lookup' : 'Show Advanced Lookup'}
          </button>
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
                >
                  Look Up
                </button>
              </div>
            </form>
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
                                : directPaymentResult.status === 'canceled' || directPaymentResult.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                      }`}>
                        {directPaymentResult.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(directPaymentResult.created), 'PPP p')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{directPaymentResult.account}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-market-green"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : paymentData.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900">No vendor payment data available</h3>
            <p className="mt-2 text-sm text-gray-500">
              There is no payment data for vendors on {format(new Date(selectedDate), 'MMMM d, yyyy')}.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Summary Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-market-olive mb-4">Daily Summary - {format(new Date(selectedDate), 'MMMM d, yyyy')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Sales Volume</p>
                  <p className="text-2xl font-bold text-market-green">
                    {formatCurrency(paymentData.reduce((sum, vendor) => sum + vendor.summary.total_volume, 0))}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-bold text-market-green">
                    {paymentData.reduce((sum, vendor) => sum + vendor.summary.transaction_count, 0)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Active Vendors</p>
                  <p className="text-2xl font-bold text-market-green">
                    {paymentData.filter(vendor => vendor.summary.transaction_count > 0).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Specific Sections */}
            {paymentData.map((vendor) => (
              <div key={vendor.vendor.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-market-olive">
                    {vendor.vendor.business_name} 
                    <span className="ml-2 text-sm text-gray-500">({vendor.vendor.status})</span>
                  </h2>
                  <p className="text-sm text-gray-500">{vendor.vendor.product_type}</p>
                  <p className="text-xs text-gray-400 mt-1">Account ID: {vendor.vendor.stripe_account_id}</p>
                </div>

                {vendor.error ? (
                  <div className="p-6 bg-red-50 text-red-700">
                    <p>Error loading data: {vendor.error}</p>
                  </div>
                ) : vendor.summary.transaction_count === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No transactions on this date</p>
                  </div>
                ) : (
                  <>
                    {/* Vendor Summary Cards */}
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500">Sales Volume</p>
                        <p className="text-xl font-bold text-market-green">{formatCurrency(vendor.summary.total_volume)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500">Transactions</p>
                        <p className="text-xl font-bold text-market-green">{vendor.summary.transaction_count}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500">Avg. Transaction</p>
                        <p className="text-xl font-bold text-market-green">{formatCurrency(vendor.summary.average_transaction_size)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500">Available Balance</p>
                        <p className="text-xl font-bold text-market-green">{formatCurrency(vendor.summary.available_balance)}</p>
                      </div>
                    </div>

                    {/* Activity Chart */}
                    <div className="p-6 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Activity</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={vendor.hourly_data.filter(hour => hour.count > 0)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour" 
                              tickFormatter={formatHour}
                              label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis yAxisId="left" orientation="left" stroke="#71725E" label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#4A8233" label={{ value: 'Sales Volume ($)', angle: 90, position: 'insideRight' }} />
                            <Tooltip 
                              formatter={(value: ValueType, name: NameType) => {
                                if (name === 'Volume') return formatCurrency(value as number);
                                return value;
                              }}
                              labelFormatter={(hour: string | number) => `Hour: ${formatHour(Number(hour))}`}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="count" name="Transactions" fill="#71725E" />
                            <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#4A8233" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    {vendor.recent_transactions.length > 0 && (
                      <div className="p-6 border-t">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {vendor.recent_transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(transaction.created), 'h:mm a')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatCurrency(transaction.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {transaction.payment_method}
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
                                              : transaction.status === 'canceled' || transaction.status === 'failed'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {transaction.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="font-mono text-xs">{transaction.id}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {transaction.receipt_url ? (
                                      <a
                                        href={transaction.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-market-green hover:text-market-green/80"
                                      >
                                        View Receipt
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 