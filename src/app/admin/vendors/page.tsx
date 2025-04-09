'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Vendor {
  name?: string;
  email: string;
  description?: string;
}

type VendorApplication = Database['public']['Tables']['vendor_applications']['Row'];

export default function AdminVendors() {
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'removed' | 'invited'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<VendorApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: string; vendor: VendorApplication | null }>({ action: '', vendor: null });
  const [isUpdating, setIsUpdating] = useState(false);
  const [sendingBulletin, setSendingBulletin] = useState(false);
  const [bulletinMessage, setBulletinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVendors, setUploadedVendors] = useState<Vendor[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('Miami');
  const [isGettingRecommendations, setIsGettingRecommendations] = useState(false);
  const [recommendationResponse, setRecommendationResponse] = useState('');
  const [hasRecommendations, setHasRecommendations] = useState(false);
  const [aiProcessingInfo, setAiProcessingInfo] = useState('');
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Market locations
  const marketLocations = [
    'Miami',
    'Fort Lauderdale',
    'Brickell',
    'Aventura',
    'El Portal',
    'Granada'
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      setError('Failed to fetch vendors');
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReReview = async (applicationId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/reviewVendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) throw new Error('Failed to re-review application');

      // Refresh the vendors list
      await fetchVendors();
    } catch (err) {
      console.error('Error re-reviewing application:', err);
      alert('Failed to re-review application');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (vendorId: string, newStatus: 'pending' | 'approved' | 'rejected' | 'removed' | 'invited') => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('vendor_applications')
        .update({ status: newStatus })
        .eq('id', vendorId);

      if (error) throw error;

      // Close the confirmation dialog
      setConfirmAction({ action: '', vendor: null });
      
      // Update vendors list
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor.id === vendorId ? { ...vendor, status: newStatus } : vendor
        )
      );
    } catch (err) {
      console.error('Error updating vendor status:', err);
      alert('Failed to update vendor status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendBulletin = async () => {
    try {
      setSendingBulletin(true);
      setBulletinMessage(null);
      
      const response = await fetch('/api/sendVendorBulletin', {
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
      
      setBulletinMessage({
        type: 'success',
        text: `Bulletin sent successfully to ${data.recipients?.length || 0} vendors`
      });
    } catch (err) {
      console.error('Error sending vendor bulletin:', err);
      setBulletinMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send bulletin'
      });
    } finally {
      setSendingBulletin(false);
      
      // Auto-hide the message after 5 seconds
      setTimeout(() => {
        setBulletinMessage(null);
      }, 5000);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        const vendors = lines.map(line => {
          // Expected format: email,name (optional)
          const parts = line.split(',').map(part => part.trim());
          const email = parts[0];
          const name = parts.length > 1 ? parts[1] : undefined;
          
          // Basic email validation
          if (!email || !email.includes('@')) {
            throw new Error(`Invalid email format: ${email}`);
          }
          
          return { email, name };
        });
        
        setUploadedVendors(vendors);
        toast.success(`Successfully parsed ${vendors.length} vendor entries`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Error parsing file. Please check format and try again.');
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading file');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  const getVendorRecommendations = async () => {
    // Validate
    if (!selectedLocation) {
      toast.error('Please select a market location');
      return;
    }
    
    // Start loading
    setIsGettingRecommendations(true);
    // Clear previous data
    setRecommendationResponse('');
    setUploadedVendors([]);
    setHasRecommendations(false);
    setAiProcessingInfo('');
    
    try {
      // Call the API endpoint
      const response = await fetch('/api/getVendorRecommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: selectedLocation }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || 'Error getting recommendations');
      }
      
      // Store the AI response text
      setRecommendationResponse(data.response);
      
      // Store AI processing info if available
      if (data.aiProcessing) {
        setAiProcessingInfo(data.aiProcessing);
      }
      
      // Don't add vendors to the table from AI recommendations
      setHasRecommendations(true);
      toast.success(`Got recommendations for ${selectedLocation}. Upload a file with emails to invite vendors.`);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get recommendations');
    } finally {
      setIsGettingRecommendations(false);
    }
  };

  const sendInvitations = async () => {
    // Check if we have any vendors with valid emails
    const vendorsWithEmails = uploadedVendors.filter(vendor => vendor.email);
    
    if (vendorsWithEmails.length === 0) {
      toast.error('No vendors with valid email addresses to invite');
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch('/api/sendInvitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendors: vendorsWithEmails }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }
      
      toast.success(`Successfully sent invitations to ${vendorsWithEmails.length} vendors`);
      setShowInviteModal(false);
      setUploadedVendors([]);
      setRecommendationResponse('');
      setHasRecommendations(false);
      
      // Refresh vendor data
      if (fetchVendors) {
        fetchVendors();
      }
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast.error(error.message || 'Error sending invitations');
    } finally {
      setIsSending(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'invited':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-market-olive text-white rounded-md hover:bg-market-olive/90 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Invite Vendors
          </button>
          <button
            onClick={handleSendBulletin}
            disabled={sendingBulletin}
            className="px-4 py-2 bg-market-green text-white rounded-md hover:bg-market-green/90 disabled:opacity-50"
          >
            {sendingBulletin ? 'Sending...' : 'Send Bulletin'}
          </button>
        </div>
      </div>
      
      {bulletinMessage && (
        <div 
          className={`p-4 mb-6 rounded-lg ${
            bulletinMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {bulletinMessage.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by business name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-market-green focus:border-market-green"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full appearance-none bg-white px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-market-green focus:border-market-green text-gray-700 pr-8 bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundSize: "1.5em 1.5em" }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="removed">Removed</option>
              <option value="invited">Invited</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendor List */}
      <div className="space-y-4">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow ${
              vendor.status === 'removed' ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-market-olive">{vendor.business_name}</h2>
                <p className="text-gray-600">{vendor.email}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                  <span>Product: <span className="font-medium">{vendor.product_type}</span></span>
                  <span>Locally Sourced: <span className="font-medium">{vendor.locally_sourced}</span></span>
                  <span>Applied: <span className="font-medium">{format(new Date(vendor.created_at), 'MMM d, yyyy')}</span></span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(vendor.status)}`}>
                  {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1 bg-market-green text-white rounded hover:bg-market-green/90 text-sm"
                  >
                    View Details
                  </button>
                  {vendor.status !== 'removed' && (
                    <button
                      onClick={() => setConfirmAction({ action: 'remove', vendor })}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      disabled={isUpdating}
                    >
                      Remove
                    </button>
                  )}
                  {vendor.status === 'removed' && (
                    <button
                      onClick={() => setConfirmAction({ action: 'restore', vendor })}
                      className="px-3 py-1 bg-market-green text-white rounded hover:bg-market-green/90 text-sm"
                      disabled={isUpdating}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No vendors found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Vendor Details Modal */}
      {isModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-semibold text-market-olive">{selectedVendor.business_name}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{selectedVendor.email}</p>
                </div>
                
                {selectedVendor.vendor_website && (
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a 
                      href={selectedVendor.vendor_website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-market-green hover:underline"
                    >
                      {selectedVendor.vendor_website}
                    </a>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Product Type</p>
                  <p className="text-gray-900">{selectedVendor.product_type}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Application Date</p>
                  <p className="text-gray-900">{format(new Date(selectedVendor.created_at), 'MMMM d, yyyy')}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Locally Sourced</p>
                  <p className="text-gray-900">{selectedVendor.locally_sourced}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Organic/Pesticide Free</p>
                  <p className="text-gray-900">{selectedVendor.organic_pesticide_free}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Eco-Friendly Packaging</p>
                  <p className="text-gray-900">{selectedVendor.eco_friendly_packaging}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(selectedVendor.status)}`}>
                    {selectedVendor.status.charAt(0).toUpperCase() + selectedVendor.status.slice(1)}
                  </p>
                </div>
              </div>

              {selectedVendor.review_notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-1">AI Review</p>
                  <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap text-sm">
                    {selectedVendor.review_notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => handleReReview(selectedVendor.id)}
                  className="px-4 py-2 bg-market-green text-white rounded hover:bg-market-green/90 focus:outline-none"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Processing...' : 'Re-review with AI'}
                </button>

                <button
                  onClick={() => {
                    handleUpdateStatus(selectedVendor.id, 'approved');
                    setIsModalOpen(false);
                  }}
                  className={`px-4 py-2 ${selectedVendor.status === 'approved' ? 'bg-gray-300 text-gray-700' : 'bg-market-green text-white'} rounded hover:bg-market-green/90 focus:outline-none`}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Processing...' : selectedVendor.status === 'approved' ? 'Already Approved' : 'Accept Vendor'}
                </button>
                
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedVendor.id, 'rejected');
                    setIsModalOpen(false);
                  }}
                  className={`px-4 py-2 ${selectedVendor.status === 'rejected' ? 'bg-gray-300 text-gray-700' : 'bg-red-600 text-white'} rounded hover:bg-red-700 focus:outline-none`}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Processing...' : selectedVendor.status === 'rejected' ? 'Already Rejected' : 'Reject Vendor'}
                </button>
                
                {selectedVendor.status !== 'removed' && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setConfirmAction({ action: 'remove', vendor: selectedVendor });
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
                    disabled={isUpdating}
                  >
                    Remove Vendor
                  </button>
                )}
                
                {selectedVendor.status === 'removed' && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setConfirmAction({ action: 'restore', vendor: selectedVendor });
                    }}
                    className="px-4 py-2 bg-market-green text-white rounded hover:bg-market-green/90 focus:outline-none"
                    disabled={isUpdating}
                  >
                    Restore Vendor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction.vendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-market-olive mb-4">
              {confirmAction.action === 'remove' ? 'Remove Vendor?' : 'Restore Vendor?'}
            </h3>
            
            <p className="text-gray-600 mb-6">
              {confirmAction.action === 'remove' 
                ? `Are you sure you want to remove ${confirmAction.vendor.business_name}? This will mark them as removed but keep their data in the system.`
                : `Are you sure you want to restore ${confirmAction.vendor.business_name}? This will return their status to "approved".`
              }
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction({ action: '', vendor: null })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (confirmAction.vendor) {
                    handleUpdateStatus(
                      confirmAction.vendor.id, 
                      confirmAction.action === 'remove' ? 'removed' : 'approved'
                    );
                  }
                }}
                className={`px-4 py-2 rounded focus:outline-none ${
                  confirmAction.action === 'remove'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-market-green text-white hover:bg-market-green/90'
                }`}
                disabled={isUpdating}
              >
                {isUpdating ? 'Processing...' : confirmAction.action === 'remove' ? 'Remove' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite New Vendors Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Invite New Vendors</h3>
              
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-2">Find Vendors with AI</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Market Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-market-green focus:border-market-green"
                    >
                      {marketLocations.map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={getVendorRecommendations}
                    disabled={isGettingRecommendations}
                    className="w-full px-4 py-2 bg-market-green text-white rounded-md hover:bg-market-green/90 disabled:opacity-50"
                  >
                    {isGettingRecommendations ? 'Finding Vendors...' : 'Get Vendor Recommendations'}
                  </button>
                </div>
              </div>
              
              {/* Manual Input Option */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-2">Upload Vendor List with Emails</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isGettingRecommendations}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    {isUploading ? 'Processing...' : 'Select File'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Format: one vendor per line as <code>email,name</code>
                  </p>
                  {hasRecommendations && uploadedVendors.length === 0 && (
                    <p className="mt-3 text-amber-600 text-xs font-medium">
                      To invite vendors from the AI recommendations, upload a file with their email addresses.
                    </p>
                  )}
                </div>
              </div>

              {/* AI Response Display */}
              {recommendationResponse && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-2">AI Recommendations</h4>
                  <div className="bg-gray-50 rounded-md p-4 max-h-80 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{recommendationResponse}</p>
                  </div>
                  
                  {aiProcessingInfo && (
                    <div className="mt-2 bg-blue-50 rounded-md p-3 border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <span className="font-medium">AI Processing:</span> {aiProcessingInfo}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Vendor List Display */}
              {uploadedVendors.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium text-gray-700">
                      Vendors to Invite ({uploadedVendors.length})
                    </h4>
                    <button
                      onClick={() => setUploadedVendors([])}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear List
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadedVendors.map((vendor, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-700">{vendor.name || 'Unknown'}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">
                              {vendor.email ? vendor.email : (
                                <span className="text-amber-600 text-xs">No email - upload file with emails to invite vendors</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs">
                              {vendor.description === 'Found with AI' ? (
                                <span className="text-green-600">{vendor.description}</span>
                              ) : vendor.description === 'AI-generated email' ? (
                                <span className="text-amber-600">{vendor.description}</span>
                              ) : (
                                <span className="text-gray-500">{vendor.description}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setUploadedVendors([]);
                    setRecommendationResponse('');
                    setHasRecommendations(false);
                  }}
                  className="px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                
                <button
                  onClick={sendInvitations}
                  disabled={!uploadedVendors.some(v => v.email) || isSending}
                  className="px-4 py-2 bg-market-olive text-white rounded-md hover:bg-market-olive/90 disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send Invitations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 