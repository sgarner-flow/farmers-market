import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createStripeClient, issueVirtualCard, CardholderData } from '@/lib/stripe';
import { sendEmail } from '@/lib/email-utils';
import { createBaseEmailTemplate } from '@/lib/email-templates/base-template';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: Request) {
  try {
    console.log('issueVirtualCard endpoint called');
    
    // Verify API clients are initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not set' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { customerId, applicationId, email, name, cardholderData } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer name - from direct input, Supabase, or fallback
    let customerName = name || '';
    
    // If applicationId is provided and no name directly, try to get from Supabase
    if (applicationId && !customerName) {
      const supabase = createServerClient();
      const { data: application } = await supabase
        .from('vendor_applications')
        .select('business_name')
        .eq('id', applicationId)
        .single();
      
      if (application) {
        customerName = application.business_name;
      }
    }
    
    // Issue the virtual card
    console.log(`Issuing virtual card for customer: ${customerId}`);
    
    try {
      const issueResult = await issueVirtualCard(
        stripe, 
        customerId, 
        cardholderData as CardholderData
      );
      console.log('Virtual card issued successfully');

      // Get card details
      const cardDetails = issueResult.card;
      const cardNumber = cardDetails.number;
      const cardExpMonth = cardDetails.exp_month.toString().padStart(2, '0');
      const cardExpYear = cardDetails.exp_year.toString().slice(-2);
      const cardCvc = cardDetails.cvc;
      
      // Send email with card details if email provided
      if (email) {
        console.log(`Sending virtual card details to: ${email}`);
        
        // Create email content
        const emailMainContent = `
          <h2 style="color: #4A4A4A; margin-bottom: 20px;">Your Flow Farmers Market Virtual Card</h2>
          
          <p style="margin-bottom: 16px;">Hello${customerName ? ' ' + customerName : ''},</p>
          
          <p style="margin-bottom: 16px;">Your virtual debit card has been issued. Here are your card details:</p>
          
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <table cellpadding="8" style="width: 100%;">
              <tr>
                <td style="font-weight: bold; width: 120px;">Card Number:</td>
                <td>${cardNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Expiration:</td>
                <td>${cardExpMonth}/${cardExpYear}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">CVC:</td>
                <td>${cardCvc}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin-bottom: 16px;">This card has been loaded with $10.00 that you can use for your purchases. Please treat this card information as confidential.</p>
          
          <p style="margin-bottom: 16px;">If you have any questions, please contact us.</p>
        `;
        
        // Generate the complete email HTML using our base template
        const emailHtml = createBaseEmailTemplate({
          title: 'Your Flow Farmers Market Virtual Card',
          previewText: 'Your virtual debit card information',
          mainContent: emailMainContent,
          footerContent: `
            <p style="margin-bottom: 8px;">Best regards,<br>Flow Farmers Market Team</p>
            <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
            <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
          `
        });
        
        // Send the email using our utility function
        try {
          await sendEmail({
            to: email,
            subject: 'Flow Farmers Market - Your Virtual Card',
            html: emailHtml
          });
          console.log('Email sent successfully');
        } catch (emailError: any) {
          console.error('Error sending email:', emailError);
          // Continue processing even if email fails
        }
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Virtual card issued successfully',
        cardId: cardDetails.id,
        email_sent: !!email
      });
    
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // Handle specific Stripe errors with more descriptive messages
      let errorMessage = stripeError.message || 'Failed to issue virtual card';
      let statusCode = 500;
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        if (stripeError.message.includes('outstanding requirements')) {
          errorMessage = 'Cardholder has outstanding requirements. Please set up Stripe Issuing properly in your dashboard.';
        } else if (stripeError.message.includes('cardholder')) {
          errorMessage = 'Invalid cardholder information. Please check your input.';
        }
        statusCode = 400;
      } else if (stripeError.type === 'StripePermissionError') {
        errorMessage = 'Your Stripe account does not have permission to use the Issuing API. Please contact Stripe to enable this feature.';
        statusCode = 403;
      }
      
      return NextResponse.json(
        { 
          error: {
            message: errorMessage,
            type: stripeError.type || 'UnknownError',
            code: stripeError.code,
            param: stripeError.param,
            detail: stripeError.message,
            raw: process.env.NODE_ENV === 'development' ? stripeError : undefined
          }
        },
        { status: statusCode }
      );
    }
    
  } catch (error: any) {
    console.error('Error issuing virtual card:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to issue virtual card' },
      { status: 500 }
    );
  }
} 