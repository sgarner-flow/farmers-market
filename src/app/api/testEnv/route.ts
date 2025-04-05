import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';
import Stripe from 'stripe';
import { Resend } from 'resend';

export async function GET() {
  const results: Record<string, { status: 'success' | 'error'; message: string }> = {};

  // Test Supabase Connection
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('mailing_list').select('count').limit(1);
    
    if (error) throw error;
    
    results.supabase = {
      status: 'success',
      message: 'Successfully connected to Supabase and queried mailing_list table'
    };
  } catch (error) {
    results.supabase = {
      status: 'error',
      message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Test OpenAI API
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5
    });

    results.openai = {
      status: 'success',
      message: 'Successfully connected to OpenAI API'
    };
  } catch (error) {
    results.openai = {
      status: 'error',
      message: `OpenAI API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Test Stripe Connection
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    
    await stripe.balance.retrieve();
    
    results.stripe = {
      status: 'success',
      message: 'Successfully connected to Stripe API'
    };
  } catch (error) {
    results.stripe = {
      status: 'error',
      message: `Stripe connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Test Resend API
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.get('test');
    
    results.resend = {
      status: 'success',
      message: 'Successfully connected to Resend API'
    };
  } catch (error) {
    // Note: Resend API might return 404 for non-existent email IDs, which is still a successful connection
    if (error instanceof Error && error.message.includes('404')) {
      results.resend = {
        status: 'success',
        message: 'Successfully connected to Resend API (404 expected for test email)'
      };
    } else {
      results.resend = {
        status: 'error',
        message: `Resend API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Check if any service failed
  const hasErrors = Object.values(results).some(result => result.status === 'error');

  return NextResponse.json({
    success: !hasErrors,
    results,
    timestamp: new Date().toISOString()
  }, {
 