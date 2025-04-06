import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createStripeClient } from '@/lib/stripe';
import sgMail from '@sendgrid/mail';
import fs from 'fs';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);

// Make sure to initialize SendGrid at the top of the file
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(request: Request) {
  try {
    console.log('SendStripeInvoice endpoint called');
    const body = await request.json();
    console.log('Request body:', body);

    const { email, business_name, applicationId } = body;

    if (!email || !business_name || !applicationId) {
      console.log('Missing required fields:', { email, business_name, applicationId });
      return NextResponse.json(
        { error: 'Email, business name, and application ID are required' },
        { status: 400 }
      );
    }

    // Log Stripe and SendGrid API key presence
    console.log('API Keys configured:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY
    });

    // Fetch the vendor application
    const supabase = createServerClient();
    console.log('Fetching application from Supabase...');
    const { data: application, error: fetchError } = await supabase
      .from('vendor_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('Error fetching application:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      );
    }

    console.log('Application found:', application);

    // Create Stripe resources
    console.log('Creating Stripe customer...');
    const customer = await stripe.customers.create({
      email,
      name: business_name,
      metadata: {
        application_id: applicationId,
      },
    });
    console.log('Stripe customer created:', customer.id);

    console.log('Creating Stripe invoice...');
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        application_id: applicationId,
      },
    });
    console.log('Invoice created:', invoice.id);

    console.log('Adding invoice item...');
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: 5000,
      currency: 'usd',
      description: 'Vendor Application Fee - Flow Farmers Market',
    });

    console.log('Finalizing invoice...');
    if (!invoice.id) {
      throw new Error('Invoice ID is undefined');
    }
    const finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    console.log('Sending invoice via Stripe...');
    await stripe.invoices.sendInvoice(invoice.id);

    console.log('Creating Stripe Connect account...');
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_profile: {
        name: business_name,
        mcc: '5999',
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        application_id: applicationId,
      },
    });
    console.log('Stripe Connect account created:', account.id);

    console.log('Creating account setup link...');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-dashboard?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-apply-complete?success=true`,
      type: 'account_onboarding',
    });

    // Prepare and send email with the correct links
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Flow Farmers Market</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
      <!-- Main container -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6EEDD;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <!-- Email content container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6EEDD; max-width: 600px; margin: 0 auto;">
              <!-- Header section with logo -->
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <!-- Flow logo image -->
                  <div style="max-width: 250px; margin: 0 auto;">
                    <img src="cid:flow-header" alt="Flow Farmers Market" style="display: block; width: 100%; max-width: 250px; height: auto;">
                  </div>
                </td>
              </tr>
              
              <!-- Content section -->
              <tr>
                <td style="padding: 20px; background-color: #F6EEDD;">
                  <h1 style="color: #71725E; font-size: 24px; margin-bottom: 20px; font-weight: bold;">Welcome to Flow Farmers Market!</h1>
                  <p style="margin-bottom: 16px;">Dear ${business_name},</p>
                  <p style="margin-bottom: 16px;">Your vendor application has been approved! Please complete these two important steps to finalize your application:</p>
                  
                  <div style="background-color: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #71725E; font-size: 18px; margin-top: 5px; margin-bottom: 15px; font-weight: bold;">Step 1: Pay Your Application Fee</h2>
                    <p style="margin-bottom: 15px;">Please click the button below to view and pay your vendor application fee.</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${finalInvoice.hosted_invoice_url}" style="display: inline-block; background-color: #71725E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View & Pay Invoice</a>
                    </div>
                  </div>
                  
                  <div style="background-color: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #71725E; font-size: 18px; margin-top: 5px; margin-bottom: 15px; font-weight: bold;">Step 2: Set Up Your Payment Processing</h2>
                    <p style="margin-bottom: 15px;">After paying your application fee, please set up your Stripe account to be able to accept payments at the market.</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${accountLink.url}" style="display: inline-block; background-color: #71725E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Set Up Stripe Account</a>
                    </div>
                  </div>
                  
                  <p style="margin-bottom: 16px;">If you have any questions or need assistance, please contact us at <a href="mailto:sgarns@gmail.com" style="color: #4A8233; text-decoration: underline;">sgarns@gmail.com</a>.</p>
                  
                  <div style="text-align: center; padding: 20px 0;">
                    <!-- Divider image -->
                    <div style="max-width: 96px; margin: 0 auto;">
                      <img src="cid:divider-padded" alt="Divider" style="display: block; width: 100%; max-width: 96px; height: auto;">
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Footer section -->
              <tr>
                <td style="padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #DDD;">
                  <!-- Footer image -->
                  <div style="max-width: 150px; margin: 0 auto 15px auto;">
                    <img src="cid:oneness-light" alt="Flow Farmers Market Footer" style="display: block; width: 100%; max-width: 150px; height: auto;">
                  </div>
                  <p style="margin-bottom: 8px;">Best regards,<br>Flow Farmers Market Team</p>
                  <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
                  <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Updated email sending section
    try {
      console.log('Preparing to send email...');
      
      const msg = {
        to: email,
        from: {
          email: 'sgarns@gmail.com',
          name: 'Flow Farmers Market'
        },
        subject: 'Flow Farmers Market - Complete Your Vendor Application',
        html: emailHtml,
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          }
        },
        attachments: [
          {
            filename: 'Flow-Header.png',
            type: 'image/png',
            content_id: 'flow-header',
            content: fs.readFileSync('public/Flow-Header.png').toString('base64'),
            disposition: 'inline'
          },
          {
            filename: 'Dividier-Padded.png',
            type: 'image/png', 
            content_id: 'divider-padded',
            content: fs.readFileSync('public/Dividier-Padded.png').toString('base64'),
            disposition: 'inline'
          },
          {
            filename: 'Oneness_-_light_1.png',
            type: 'image/png',
            content_id: 'oneness-light',
            content: fs.readFileSync('public/Oneness_-_light_1.png').toString('base64'),
            disposition: 'inline'
          }
        ]
      };

      // Send email
      const result = await sgMail.send(msg);
      console.log('Email sent successfully:', result);

    } catch (emailError: any) {
      // Log the full error details with type assertion
      console.error('Failed to send email:', {
        error: emailError,
        message: emailError.message,
        response: emailError.response?.body,
        stack: emailError.stack
      });

      // Try sending with basic configuration
      try {
        console.log('Attempting simplified email send...');
        await sgMail.send({
          to: email,
          from: 'sgarns@gmail.com', // Simplified sender format
          subject: 'Flow Farmers Market - Complete Your Vendor Application',
          html: emailHtml
        });
        console.log('Simplified email sent successfully');
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        // Continue processing even if email fails
      }
    }

    // Update application with Stripe information
    console.log('Updating application in Supabase...');
    const { error: updateError } = await supabase
      .from('vendor_applications')
      .update({
        stripe_customer_id: customer.id,
        stripe_account_id: account.id,
        invoice_link: finalInvoice.hosted_invoice_url,
        account_setup_link: accountLink.url,
        payment_status: 'pending',
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application:', updateError);
    }

    // Return success response even if email fails
    return NextResponse.json({
      success: true,
      invoice_url: finalInvoice.hosted_invoice_url,
      account_setup_url: accountLink.url
    });

  } catch (error: any) {
    console.error('Error in sendStripeInvoice:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 