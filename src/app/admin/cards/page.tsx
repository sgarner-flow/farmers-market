'use client';

import { useState } from 'react';

type CardholderFormData = {
  firstName: string;
  lastName: string;
  nameOnCard: string;
  email: string;
  phone: string;
  dob: {
    month: string;
    day: string;
    year: string;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
};

export default function AdminCards() {
  const [formData, setFormData] = useState<CardholderFormData>({
    firstName: '',
    lastName: '',
    nameOnCard: '',
    email: '',
    phone: '',
    dob: {
      month: '',
      day: '',
      year: ''
    },
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  });
  const [issuingCard, setIssuingCard] = useState(false);
  const [resultMessage, setResultMessage] = useState<{type: 'success' | 'error', text: string, detail?: string} | null>(null);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData] as any,
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      setResultMessage({
        type: 'error',
        text: 'Email address is required'
      });
      return;
    }

    if (!acceptedTerms) {
      setResultMessage({
        type: 'error',
        text: 'You must acknowledge the terms'
      });
      return;
    }
    
    try {
      setIssuingCard(true);
      setResultMessage(null);
      
      // Create a new customer in Stripe first
      const createCustomerResponse = await fetch('/api/createStripeCustomer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        }),
      });
      
      const customerResult = await createCustomerResponse.json();
      
      if (!createCustomerResponse.ok) {
        throw new Error(customerResult.error || 'Failed to create customer');
      }
      
      // Now issue the virtual card
      const cardResponse = await fetch('/api/issueVirtualCard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerResult.customerId,
          email: formData.email,
          name: formData.nameOnCard || `${formData.firstName} ${formData.lastName}`,
          cardholderData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            dob: formData.dob,
            address: formData.address
          }
        }),
      });
      
      const cardResult = await cardResponse.json();
      
      if (!cardResponse.ok) {
        // If the error is related to Stripe Issuing setup, show the setup info
        if (cardResult.error) {
          console.error('Error details:', cardResult.error);
          
          if (typeof cardResult.error === 'object') {
            console.error('Error type:', cardResult.error.type);
            console.error('Error message:', cardResult.error.message);
            console.error('Error details:', cardResult.error.detail);
          }
          
          if (cardResult.error.includes && cardResult.error.includes('outstanding requirements')) {
            setShowStripeSetup(true);
          }
        }
        
        throw new Error(
          typeof cardResult.error === 'object' 
            ? cardResult.error.message 
            : cardResult.error || 'Failed to issue virtual card'
        );
      }
      
      setResultMessage({
        type: 'success',
        text: `Virtual card issued successfully${cardResult.email_sent ? ' and email sent to ' + formData.email : ''}`
      });
      
      // Clear form on success
      setFormData({
        firstName: '',
        lastName: '',
        nameOnCard: '',
        email: '',
        phone: '',
        dob: {
          month: '',
          day: '',
          year: ''
        },
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US'
        }
      });
      setAcceptedTerms(false);
      
    } catch (error: any) {
      console.error('Error issuing card:', error);
      
      // Extract error details from the response or error object
      let errorMessage = 'Failed to issue virtual card';
      let errorDetail = '';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if this is from our API with structured error
      if (error.cause && error.cause.error) {
        if (typeof error.cause.error === 'object') {
          errorMessage = error.cause.error.message || errorMessage;
          errorDetail = error.cause.error.detail || '';
        } else {
          errorMessage = error.cause.error || errorMessage;
        }
      }
      
      setResultMessage({
        type: 'error',
        text: errorMessage,
        detail: errorDetail || error.detail || error.stack
      });
      
      // If the error mentions "outstanding requirements" or "Stripe Issuing", 
      // show the Stripe setup guidance
      if (errorMessage.includes('outstanding requirements') || 
          errorMessage.includes('Stripe Issuing') ||
          errorMessage.includes('cardholder')) {
        setShowStripeSetup(true);
      }
    } finally {
      setIssuingCard(false);
    }
  };

  const states = [
    { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-market-olive">Issue Virtual Cards</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Test Mode:</strong> This is running in Stripe test mode. No real charges will be made.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-market-olive mb-4">Issue a New Card</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Legal Name Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Legal Name</h3>
            <p className="text-sm text-gray-500 mb-4">Full legal name as it appears on government-issued documents</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="Last Name"
                />
              </div>
            </div>
          </div>

          {/* Name on Card */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Name on Card</h3>
            <p className="text-sm text-gray-500 mb-4">The name printed on the card (can be different from legal name)</p>
            <input
              id="nameOnCard"
              name="nameOnCard"
              type="text"
              value={formData.nameOnCard}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
              placeholder="Name on Card (if different from legal name)"
            />
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
            <p className="text-sm text-gray-500 mb-4">Email and phone are required for digital wallet support</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="Email Address"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="+1 (555) 555-5555"
                />
              </div>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Date of Birth</h3>
            <p className="text-sm text-gray-500 mb-4">Required to confirm cardholder identity</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="dob.month" className="block text-sm font-medium text-gray-700 mb-1">
                  Month *
                </label>
                <select
                  id="dob.month"
                  name="dob.month"
                  value={formData.dob.month}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                >
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return (
                      <option key={month} value={month.toString().padStart(2, '0')}>
                        {month}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="dob.day" className="block text-sm font-medium text-gray-700 mb-1">
                  Day *
                </label>
                <select
                  id="dob.day"
                  name="dob.day"
                  value={formData.dob.day}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <option key={day} value={day.toString().padStart(2, '0')}>
                        {day}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="dob.year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <select
                  id="dob.year"
                  name="dob.year"
                  value={formData.dob.year}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                >
                  <option value="">Year</option>
                  {Array.from({ length: 80 }, (_, i) => {
                    const year = new Date().getFullYear() - 18 - i;
                    return (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Billing Address</h3>
            <p className="text-sm text-gray-500 mb-4">Address for all cards issued to this cardholder</p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  id="address.country"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                >
                  <option value="US">United States</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="address.line1" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  id="address.line1"
                  name="address.line1"
                  type="text"
                  value={formData.address.line1}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="Street Address"
                />
              </div>
              
              <div>
                <label htmlFor="address.line2" className="block text-sm font-medium text-gray-700 mb-1">
                  Apartment, Suite, etc. (optional)
                </label>
                <input
                  id="address.line2"
                  name="address.line2"
                  type="text"
                  value={formData.address.line2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="Apartment, Suite, Unit, etc."
                />
              </div>
              
              <div>
                <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="address.city"
                  name="address.city"
                  type="text"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  placeholder="City"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <select
                    id="address.state"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                  >
                    <option value="">Select State</option>
                    {states.map(state => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="address.postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    id="address.postalCode"
                    name="address.postalCode"
                    type="text"
                    value={formData.address.postalCode}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-market-green focus:border-market-green"
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Government ID Notice */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-md font-medium text-blue-700 mb-2">Government-Issued ID</h3>
            <p className="text-sm text-blue-600 mb-2">
              In test mode, we're bypassing ID verification. In production, you would need to collect and verify a government-issued ID.
            </p>
            <p className="text-sm text-blue-600">
              For testing purposes, we're using mock data that passes Stripe's verification.
            </p>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={() => setAcceptedTerms(!acceptedTerms)}
                className="h-4 w-4 text-market-green border-gray-300 rounded focus:ring-market-green"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">
                The cardholder has agreed to the Terms and E-sign policy
              </label>
              <p className="text-gray-500">
                By checking this box, you confirm that the cardholder has agreed to the card terms and electronic signature policy.
              </p>
            </div>
          </div>
          
          {resultMessage && (
            <div className={`p-4 rounded-md ${
              resultMessage.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="font-medium">{resultMessage.text}</p>
              {resultMessage.detail && (
                <p className="mt-2 text-sm opacity-80">{resultMessage.detail}</p>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={issuingCard || !formData.email || !acceptedTerms}
              className="px-6 py-3 bg-market-green text-white rounded-md hover:bg-market-green/90 focus:outline-none focus:ring-2 focus:ring-market-green/50 disabled:opacity-50"
            >
              {issuingCard ? 'Issuing Card...' : 'Issue Virtual Card'}
            </button>
          </div>
        </form>
      </div>
      
      {showStripeSetup && (
        <div className="bg-blue-50 border-blue-200 border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Stripe Issuing Setup Required</h2>
          
          <p className="text-blue-700 mb-4">
            To use virtual cards, you need to properly set up Stripe Issuing in your Stripe Dashboard:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2 text-blue-700 mb-4">
            <li>
              <strong>Enable Stripe Issuing:</strong> Log into your{' '}
              <a 
                href="https://dashboard.stripe.com/issuing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                Stripe Dashboard
              </a>{' '}
              and activate Issuing.
            </li>
            <li>
              <strong>Verify Your Account:</strong> Complete any required verification steps in the Stripe Dashboard.
            </li>
            <li>
              <strong>Test Mode Setup:</strong> Make sure you're in test mode when testing this feature.
            </li>
            <li>
              <strong>API Keys:</strong> Verify you're using the correct Stripe API keys in your .env file.
            </li>
          </ol>
          
          <p className="text-blue-700">
            For detailed instructions, see the{' '}
            <a 
              href="https://stripe.com/docs/issuing/quickstart" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Stripe Issuing Quickstart Guide
            </a>.
          </p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-market-olive mb-4">About Test Virtual Cards</h2>
        <p className="text-gray-600 mb-3">
          In test mode, virtual cards are issued with the following characteristics:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-4">
          <li>Cards are loaded with a $10.00 test balance</li>
          <li>Card details will be emailed to the provided address</li>
          <li>No real money is transferred or charged</li>
          <li>Transactions will appear in your Stripe dashboard with "Test" label</li>
        </ul>
        <p className="text-gray-600">
          To test the card in other systems, use a processor that supports Stripe test cards or the{' '}
          <a href="https://stripe.com/docs/issuing/testing" className="text-market-green hover:underline" target="_blank" rel="noopener noreferrer">
            Stripe testing tools
          </a>.
        </p>
      </div>
    </div>
  );
} 