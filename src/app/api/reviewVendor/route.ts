import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';

// Check for OpenAI API key - but don't throw during build time
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: Request) {
  try {
    // Get the applicationId from the request
    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Verify OpenAI client is initialized at runtime
    if (!openai) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    // Find the application by ID
    const { data: existingApp, error: fetchError } = await supabase
      .from('vendor_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('Error fetching application:', fetchError);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    let decision: 'approved' | 'rejected' | 'pending' = 'pending';
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
Business Name: ${existingApp.business_name}
Email: ${existingApp.email}
Product Type: ${existingApp.product_type}
Locally Sourced: ${existingApp.locally_sourced || 'Not specified'}
Organic/Pesticide Free: ${existingApp.organic_pesticide_free || 'Not specified'}
Eco-Friendly Packaging: ${existingApp.eco_friendly_packaging || 'Not specified'}
Website: ${existingApp.vendor_website || 'Not provided'}

Provide your decision and detailed explanation.`
          }
        ],
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        review = content;
        // Look specifically for the DECISION: prefix
        if (content.includes('DECISION: APPROVED')) {
          decision = 'approved';
        } else if (content.includes('DECISION: DENIED')) {
          decision = 'rejected';
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
      console.error('Error updating application:', updateError);
      throw updateError;
    }

    // If approved, trigger the Stripe invoice process
    if (decision === 'approved') {
      try {
        console.log('Application approved, attempting to send Stripe invoice...');
        
        // Determine base URL for the API call
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/sendStripeInvoice`;
        
        console.log('Sending Stripe invoice to:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: existingApp.email,
            business_name: existingApp.business_name,
            applicationId: existingApp.id
          })
        });

        if (!response.ok) {
          console.error('Stripe invoice response error:', response.status);
        }
      } catch (stripeError) {
        console.error('Failed to send Stripe invoice:', stripeError);
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