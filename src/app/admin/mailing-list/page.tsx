'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';

type Subscriber = {
  id: string;
  created_at: string;
  name: string;
  email: string;
};

export default function MailingListPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching mailing list subscribers...');
      
      // Use API endpoint instead of direct createServerClient
      const response = await fetch('/api/getMailingList');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscribers');
      }
      
      const data = await response.json();
      console.log(`Found ${data.subscribers?.length || 0} subscribers:`, data.subscribers);
      setSubscribers(data.subscribers || []);
    } catch (err) {
      console.error('Error fetching mailing list:', err);
      setError('Failed to load mailing list. Please try again later.');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    try {
      setSendingNewsletter(true);
      setNewsletterMessage(null);
      
      const response = await fetch('/api/sendMarketNewsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      if (!response.ok) {
        const errorMessage = data && typeof data === 'object' && 'error' in data
          ? data.error
          : `Server returned ${response.status}: ${response.statusText || 'Unknown error'}`;
        throw new Error(errorMessage);
      }
      
      setNewsletterMessage({
        type: 'success',
        text: `Newsletter sent successfully to ${data.recipients?.length || 0} subscribers`
      });
    } catch (err) {
      console.error('Error sending newsletter:', err);
      setNewsletterMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send newsletter'
      });
    } finally {
      setSendingNewsletter(false);
      
      // Auto-hide the message after 5 seconds
      setTimeout(() => {
        setNewsletterMessage(null);
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Mailing List</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-white rounded shadow"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Mailing List</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mailing List</h1>
        
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleSendNewsletter}
            disabled={sendingNewsletter}
            className="px-4 py-2 bg-market-green text-white rounded-lg shadow hover:bg-market-green/90 transition-colors focus:outline-none focus:ring-2 focus:ring-market-green/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingNewsletter ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Sending...
              </>
            ) : (
              'Send Market Newsletter'
            )}
          </button>
        </div>
      </div>
      
      {newsletterMessage && (
        <div 
          className={`p-4 mb-6 rounded-lg ${
            newsletterMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {newsletterMessage.text}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {subscriber.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {subscriber.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(subscriber.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No subscribers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500">
          Use the "Send Market Newsletter" button to send a newsletter to all subscribers with this week's market information.
        </p>
      </div>
    </div>
  );
} 