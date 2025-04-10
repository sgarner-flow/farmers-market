import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createChatCompletion } from '@/lib/openai';

export async function POST(request: Request) {
  console.log('reviewVendor endpoint called');
  const requestStartTime = Date.now();
  
  try {
    // Get the applicationId from the request
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { applicationId } = requestBody;

    if (!applicationId) {
      console.error('Missing applicationId in request');
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Verify OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      // Instead of returning an error, proceed with a manual review message
      return NextResponse.json({
        success: true,
        applicationId,
        decision: 'pending',
        review: '[AUTOMATED RESPONSE] The automated review system is currently unavailable. This application has been marked as pending for manual review.',
        automated: false
      });
    }

    console.log(`Processing application ID: ${applicationId}`);
    
    const supabase = createServerClient();
    console.log('Supabase client created');

    // Find the application by ID
    console.log(`Fetching application with ID: ${applicationId}`);
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

    console.log(`Found application: ${existingApp.business_name}`);

    let decision: 'approved' | 'rejected' | 'pending' = 'pending';
    let review = '';
    let automated = true;

    try {
      console.log('Sending request to OpenAI...');
      console.log(`Using model: gpt-3.5-turbo with API key: ${process.env.OPENAI_API_KEY ? 'present' : 'missing'}`);
      const openaiStartTime = Date.now();
      
      // Use our enhanced createChatCompletion function instead of directly calling OpenAI
      const completion = await createChatCompletion(
        [
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
        "gpt-3.5-turbo", // Use the same model as before
        {
          max_tokens: 500,
          apiOptions: {
            timeoutMs: 60000,    // Full 60 second timeout
            maxRetries: 3,       // Exactly 3 retries
            initialRetryDelay: 1000,
            maxRetryDelay: 5000
          }
        }
      );
      
      const openaiEndTime = Date.now();
      console.log(`OpenAI response received in ${openaiEndTime - openaiStartTime}ms`);
      
      const content = completion.choices[0]?.message?.content;
      if (content) {
        console.log('Content received from OpenAI:', content.substring(0, 100) + '...');
        review = content;
        // Look specifically for the DECISION: prefix
        if (content.includes('DECISION: APPROVED')) {
          decision = 'approved';
          console.log('Decision: APPROVED');
        } else if (content.includes('DECISION: DENIED')) {
          decision = 'rejected';
          console.log('Decision: DENIED');
        } else {
          console.log('Decision not found in response, defaulting to PENDING');
        }
      } else {
        console.error('No content received from OpenAI');
      }
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      automated = false;
      decision = 'pending';
      review = '[AUTOMATED RESPONSE] An error occurred during the automated review process. This application has been marked as pending for manual review.';
    }

    // Update the existing application
    console.log(`Updating application status to: ${decision}`);
    const dbUpdateStartTime = Date.now();
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
    const dbUpdateEndTime = Date.now();
    console.log(`Database updated in ${dbUpdateEndTime - dbUpdateStartTime}ms`);

    // If approved, trigger the Stripe invoice process
    if (decision === 'approved') {
      try {
        console.log('Application approved, attempting to send Stripe invoice...');
        
        // Determine base URL for the API call
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
        if (!baseUrl) {
          throw new Error('Neither NEXT_PUBLIC_APP_URL nor VERCEL_URL environment variables are set');
        }
        
        // Make sure baseUrl does not have a trailing slash and use HTTPS
        let apiUrl = baseUrl.replace(/\/$/, '');
        if (!apiUrl.startsWith('http')) {
          apiUrl = `https://${apiUrl}`;
        }
        apiUrl = `${apiUrl}/api/sendStripeInvoice`;
        
        console.log('Sending Stripe invoice to:', apiUrl);
        
        // Create an AbortController for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: existingApp.email,
              business_name: existingApp.business_name,
              applicationId: existingApp.id
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error('Stripe invoice response error:', response.status);
            let responseText;
            try {
              responseText = await response.text();
            } catch (textError) {
              responseText = "Could not read response text";
            }
            console.error('Response body:', responseText);
            console.log('Will continue with review process despite Stripe invoice error');
          } else {
            console.log('Stripe invoice sent successfully');
          }
        } catch (fetchError: any) {
          console.error('Fetch error when sending Stripe invoice:', fetchError);
          if (fetchError.name === 'AbortError') {
            console.log('Stripe invoice request timed out');
          }
          console.log('Will continue with review process despite Stripe invoice error');
        }
      } catch (stripeError) {
        console.error('Failed to send Stripe invoice:', stripeError);
        console.log('Will continue with review process despite Stripe invoice error');
      }
    }

    const requestEndTime = Date.now();
    console.log(`reviewVendor endpoint completed in ${requestEndTime - requestStartTime}ms`);
    
    console.log('Returning success response');
    return NextResponse.json({
      success: true,
      applicationId: existingApp.id,
      decision,
      review,
      automated
    });
  } catch (error: any) {
    console.error('Error in reviewVendor:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
} 