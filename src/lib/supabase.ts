import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Create a server-side Supabase client with service role
// NOTE: This should only be used in server components or API routes
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// Types for your database schema
export type Database = {
  public: {
    Tables: {
      vendors: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string;
          category: string;
          user_id: string;
          status: 'pending' | 'approved' | 'rejected';
          booth_number?: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description: string;
          category: string;
          user_id: string;
          status?: 'pending' | 'approved' | 'rejected';
          booth_number?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string;
          category?: string;
          user_id?: string;
          status?: 'pending' | 'approved' | 'rejected';
          booth_number?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          full_name: string;
          phone?: string;
          avatar_url?: string;
        };
        Insert: {
          id: string;
          created_at?: string;
          email: string;
          full_name: string;
          phone?: string;
          avatar_url?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          phone?: string;
          avatar_url?: string;
        };
      };
      vendor_applications: {
        Row: {
          id: string;
          created_at: string;
          business_name: string;
          product_type: 'Produce' | 'Baked Goods' | 'Beverages' | 'Crafts' | 'Other';
          locally_sourced: 'Yes' | 'Partially' | 'No';
          organic_pesticide_free: 'Yes' | 'Some' | 'No';
          eco_friendly_packaging: 'Yes' | 'Working on it' | 'No';
          email: string;
          status: 'pending' | 'approved' | 'rejected' | 'removed' | 'invited' | 'Reviewed';
          review_notes?: string;
          stripe_customer_id?: string;
          stripe_account_id?: string;
          invoice_link?: string;
          account_setup_link?: string;
          payment_status: 'pending' | 'paid' | 'failed';
          last_emailed?: string;
          vendor_website?: string;
          location?: 'Miami' | 'FLL' | 'Brickell' | 'Aventura' | 'El Portal' | 'Granada';
        };
        Insert: {
          id?: string;
          created_at?: string;
          business_name: string;
          product_type: 'Produce' | 'Baked Goods' | 'Beverages' | 'Crafts' | 'Other';
          locally_sourced: 'Yes' | 'Partially' | 'No';
          organic_pesticide_free: 'Yes' | 'Some' | 'No';
          eco_friendly_packaging: 'Yes' | 'Working on it' | 'No';
          email: string;
          status?: 'pending' | 'approved' | 'rejected' | 'removed' | 'invited' | 'Reviewed';
          review_notes?: string;
          stripe_customer_id?: string;
          stripe_account_id?: string;
          invoice_link?: string;
          account_setup_link?: string;
          payment_status?: 'pending' | 'paid' | 'failed';
          last_emailed?: string;
          vendor_website?: string;
          location?: 'Miami' | 'FLL' | 'Brickell' | 'Aventura' | 'El Portal' | 'Granada';
        };
        Update: {
          id?: string;
          created_at?: string;
          business_name?: string;
          product_type?: 'Produce' | 'Baked Goods' | 'Beverages' | 'Crafts' | 'Other';
          locally_sourced?: 'Yes' | 'Partially' | 'No';
          organic_pesticide_free?: 'Yes' | 'Some' | 'No';
          eco_friendly_packaging?: 'Yes' | 'Working on it' | 'No';
          email?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'removed' | 'invited' | 'Reviewed';
          review_notes?: string;
          stripe_customer_id?: string;
          stripe_account_id?: string;
          invoice_link?: string;
          account_setup_link?: string;
          payment_status?: 'pending' | 'paid' | 'failed';
          last_emailed?: string;
          vendor_website?: string;
          location?: 'Miami' | 'FLL' | 'Brickell' | 'Aventura' | 'El Portal' | 'Granada';
        };
      };
      mailing_list: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
        };
      };
    };
  };
}; 