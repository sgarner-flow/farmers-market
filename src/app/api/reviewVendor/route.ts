import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { vendor_email, vendor_name, product_type } = await request.json();

    if (!vendor_email || !vendor_name || !product_type) {
      return NextResponse.json(
        { error: 'Vendor email, name, and product type are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // First find the existing application
    const { data: existingApp, error: fetchError } = await supabase
      .from('vendor_applications')
      .select('*')
      .eq('email', vendor_email)
      .eq('business_name', vendor_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Not found error is ok
      throw fetchError;
    }

    if (!existingApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    let decision: 'approved' | 'denied' | 'pending' = 'pending';
    let review = '';
    let automated = true;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are reviewing vendor applications for a farmers market. Your task is to evaluate applications based on:
1. Product type suitability for a farmers market
2. Commitment to sustainability (locally sourced, organic practices, eco-friendly packaging)
3. Overall fit with market values

Your response MUST:
1. Start with an explicit "DECISION: APPROVED" or "DECISION: DENIED"
2. Follow with a detailed explanation of your decision
3. Be consistent - if your explanation is positive, the decision must be APPROVED
4. Be consistent - if your explanation is negative, the decision must be DENIED

Example of a proper response:
DECISION: APPROVED
This vendor demonstrates strong alignment with our market values...`
          },
          {
            role: "user",
            content: `Please review this vendor application:
Business Name: ${vendor_name}
Email: ${vendor_email}
Product Type: ${product_type}
Locally Sourced: ${existingApp.locally_sourced}
Organic/Pesticide Free: ${existingApp.organic_pesticide_free}
Eco-Friendly Packaging: ${existingApp.eco_friendly_packaging}

Provide your decision and detailed explanation.`
          }
        ],
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        review = content;
        // Look specifically for the DECISION: prefix
        decision = content.includes('DECISION: APPROVED') ? 'approved' : 'denied';
        
        // Double-check for consistency
        const isPositiveReview = content.toLowerCase().includes('recommend') && 
          !content.toLowerCase().includes('not recommend') &&
          !content.toLowerCase().includes('cannot recommend');
          
        if (isPositiveReview && decision === 'denied') {
          // If there's an inconsistency, default to approved for positive reviews
          decision = 'approved';
          review = 'DECISION: APPROVED\n' + review;
        }
      }
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      automated = false;
      decision = 'pending';
      review = '[AUTOMATED RESPONSE] An error occurred during the automated review process. This application has been marked as pending for manual review.';
    }

    // Update the existing application
    const { error: updateError } = await supabase
      .from('vendor_applications')
      .update({
        status: decision,
        review_notes: review
      })
      .eq('id', existingApp.id);

    if (updateError) {
      throw updateError;
    }

    // If approved, trigger the Stripe invoice process
    if (decision === 'approved') {
      try {
        console.log('Application approved, attempting to send Stripe invoice...');
        const response = await fetch('http://localhost:3001/api/sendStripeInvoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: vendor_email,
            business_name: vendor_name,
            applicationId: existingApp.id
          })
        });

        console.log('Stripe invoice endpoint response status:', response.status);
        const responseData = await response.json();
        console.log('Stripe invoice endpoint response:', responseData);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Stripe invoice response error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
        }
      } catch (stripeError) {
        console.error('Failed to send Stripe invoice:', {
          error: stripeError,
          message: stripeError.message,
          stack: stripeError.stack
        });
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: existingApp.id,
      decision,
      review,
      automated
    });

  } catch (error: any) {
    console.error('Error in reviewVendor route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 