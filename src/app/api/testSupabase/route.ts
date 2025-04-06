import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('mailing_list').select('count').limit(1);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase and queried mailing_list table',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Supabase connection error:', error);
    return NextResponse.json({
      success: false,
      message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 