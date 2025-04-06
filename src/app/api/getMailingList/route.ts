import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a server-side client using environment variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create the client directly without using the helper function
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch subscribers
    const { data, error } = await supabase
      .from('mailing_list')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching mailing list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      subscribers: data,
      count: data.length 
    });
    
  } catch (error: any) {
    console.error('Error in getMailingList API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    }, { status: 500 });
  }
} 