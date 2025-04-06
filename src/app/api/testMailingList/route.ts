import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

export async function GET(request: Request) {
  try {
    console.log('Testing mailing list connection...');
    
    // Create client for regular access
    const regularClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Create client with service role for elevated access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test with regular client
    console.log('Trying regular client...');
    const { data: regularData, error: regularError } = await regularClient
      .from('mailing_list')
      .select('*');
    
    // Test with service role client
    console.log('Trying service role client...');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('mailing_list')
      .select('*');
    
    // Return results from both client types
    return NextResponse.json({
      regularClient: {
        success: !regularError,
        subscribers: regularData || [],
        count: regularData?.length || 0,
        error: regularError ? regularError.message : null
      },
      serviceClient: {
        success: !serviceError, 
        subscribers: serviceData || [],
        count: serviceData?.length || 0,
        error: serviceError ? serviceError.message : null
      }
    });
    
  } catch (err) {
    console.error('Error in test endpoint:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 