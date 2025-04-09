'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { useState } from 'react';

const vendorApplicationSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  product_type: z.enum(['Produce', 'Baked Goods', 'Beverages', 'Crafts', 'Other']),
  locally_sourced: z.enum(['Yes', 'Partially', 'No']),
  organic_pesticide_free: z.enum(['Yes', 'Some', 'No']),
  eco_friendly_packaging: z.enum(['Yes', 'Working on it', 'No']),
  email: z.string().email('Please enter a valid email address'),
  vendor_website: z.string().optional(),
  location: z.enum(['Miami', 'FLL', 'Brickell', 'Aventura', 'El Portal', 'Granada'])
});

type VendorApplicationForm = z.infer<typeof vendorApplicationSchema>;

export default function ApplyToVend() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VendorApplicationForm>({
    resolver: zodResolver(vendorApplicationSchema),
  });

  const onSubmit = async (data: VendorApplicationForm) => {
    try {
      setIsSubmitting(true);
      
      // First create the application
      const { data: application, error } = await supabase
        .from('vendor_applications')
        .insert([
          {
            email: data.email,
            business_name: data.business_name,
            product_type: data.product_type,
            locally_sourced: data.locally_sourced,
            organic_pesticide_free: data.organic_pesticide_free,
            eco_friendly_packaging: data.eco_friendly_packaging,
            vendor_website: data.vendor_website || '',
            status: 'pending',
            payment_status: 'pending',
            location: data.location,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Successfully added to database - show success immediately
      setSubmitStatus('success');
      reset();

      try {
        // Prepare the base URL - default to relative path if not specified
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? 
          process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : ''; // Remove trailing slash if present
        
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Then trigger the AI review - use relative path if no base URL
        const reviewResponse = await fetch(`${baseUrl}/api/reviewVendor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationId: application.id
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!reviewResponse.ok) {
          console.warn('AI review request was not successful:', reviewResponse.status, reviewResponse.statusText);
          // Continue execution - this is not critical for the user
        } else {
          console.log('AI review request successful');
        }
      } catch (reviewError: any) {
        // Log the error but don't fail the submission
        console.error('Error triggering AI review:', reviewError);
        if (reviewError.name === 'AbortError') {
          console.log('AI review request timed out - will be processed asynchronously');
        }
        // Not showing this error to the user as it's a background process
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-green-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-900 mb-4">
            Apply to be a Vendor
          </h1>
          <p className="text-xl text-gray-600">
            Join our community of local farmers and artisans
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-xl shadow-lg">
          {/* Business Name */}
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              id="business_name"
              {...register('business_name')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {errors.business_name && (
              <p className="mt-1 text-sm text-red-600">{errors.business_name.message}</p>
            )}
          </div>

          {/* Product Type */}
          <div>
            <label htmlFor="product_type" className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <select
              id="product_type"
              {...register('product_type')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select a product type</option>
              <option value="Produce">Produce</option>
              <option value="Baked Goods">Baked Goods</option>
              <option value="Beverages">Beverages</option>
              <option value="Crafts">Crafts</option>
              <option value="Other">Other</option>
            </select>
            {errors.product_type && (
              <p className="mt-1 text-sm text-red-600">{errors.product_type.message}</p>
            )}
          </div>

          {/* Locally Sourced */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Are your ingredients locally sourced?
            </label>
            <div className="space-y-2">
              {['Yes', 'Partially', 'No'].map((option) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={option}
                    {...register('locally_sourced')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {errors.locally_sourced && (
              <p className="mt-1 text-sm text-red-600">{errors.locally_sourced.message}</p>
            )}
          </div>

          {/* Organic/Pesticide Free */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do you use organic or pesticide-free ingredients?
            </label>
            <div className="space-y-2">
              {['Yes', 'Some', 'No'].map((option) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={option}
                    {...register('organic_pesticide_free')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {errors.organic_pesticide_free && (
              <p className="mt-1 text-sm text-red-600">{errors.organic_pesticide_free.message}</p>
            )}
          </div>

          {/* Eco-friendly Packaging */}
          <div>
            <label htmlFor="eco_friendly_packaging" className="block text-sm font-medium text-gray-700 mb-1">
              Does your business use eco-friendly packaging?
            </label>
            <select
              id="eco_friendly_packaging"
              {...register('eco_friendly_packaging')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="Yes">Yes</option>
              <option value="Working on it">Working on it</option>
              <option value="No">No</option>
            </select>
            {errors.eco_friendly_packaging && (
              <p className="mt-1 text-sm text-red-600">{errors.eco_friendly_packaging.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Market Location
            </label>
            <select
              id="location"
              {...register('location')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select a location</option>
              <option value="Miami">Miami</option>
              <option value="FLL">FLL</option>
              <option value="Brickell">Brickell</option>
              <option value="Aventura">Aventura</option>
              <option value="El Portal">El Portal</option>
              <option value="Granada">Granada</option>
            </select>
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Vendor Website */}
          <div>
            <label htmlFor="vendor_website" className="block text-sm font-medium text-gray-700 mb-1">
              Website (optional)
            </label>
            <input
              type="text"
              id="vendor_website"
              {...register('vendor_website')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {errors.vendor_website && (
              <p className="mt-1 text-sm text-red-600">{errors.vendor_website.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
              Thank you for your application! We will review it and get back to you soon.
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              There was an error submitting your application. Please try again.
              <br />
              <small>Check the browser console for detailed error information.</small>
            </div>
          )}
        </form>
      </div>
    </main>
  );
} 