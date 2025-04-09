// TypeScript types for Next.js 13+ App Router
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createStripeClient } from '@/lib/stripe';
import { createBaseEmailTemplate } from '@/lib/email-templates/base-template';

// Import SendGrid
let sgMail: any = null;
// We'll import dynamically at runtime to avoid build errors
if (typeof window === 'undefined') { // Only import on server-side
  sgMail = require('@sendgrid/mail');
}

// Declare process type
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STRIPE_SECRET_KEY?: string;
      SENDGRID_API_KEY?: string;
      NEXT_PUBLIC_APP_URL?: string;
      [key: string]: string | undefined;
    }
  }
}

// Check for API keys - don't throw during build time
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY && sgMail) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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

    // Verify API clients are initialized at runtime
    if (!stripe) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not set' },
        { status: 500 }
      );
    }

    if (!process.env.SENDGRID_API_KEY || !sgMail) {
      return NextResponse.json(
        { error: 'SENDGRID_API_KEY is not set or SendGrid module not loaded' },
        { status: 500 }
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
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flowfarmersmarket.vercel.app'}/api/refreshStripeLink?accountId=${account.id}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flowfarmersmarket.vercel.app'}/vendor-apply-complete?success=true`,
      type: 'account_onboarding',
    });

    // Create the email content
    const emailMainContent = `
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
    `;

    // Generate the complete email HTML using our base template
    const emailHtml = createBaseEmailTemplate({
      title: 'Welcome to Flow Farmers Market',
      previewText: 'Complete your vendor application for Flow Farmers Market',
      mainContent: emailMainContent,
      footerContent: `
        <p style="margin-bottom: 8px;">Best regards,<br>Flow Farmers Market Team</p>
        <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
        <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
      `
    });

    // Send the email using SendGrid
    try {
      console.log('Sending email...');
      // Create email message
      const msg = {
        to: email,
        from: {
          email: 'sgarns@gmail.com',
          name: 'Flow Farmers Market'
        },
        subject: 'Flow Farmers Market - Complete Your Vendor Application',
        html: emailHtml
      }

      // Send email
      const result = await sgMail.send(msg);
      console.log('Email sent successfully:', result);

    } catch (emailError: any) {
      console.error('Error sending email:', {
        message: emailError.message,
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
    console.error('Error sending invoice:', {
      message: error.message,
    });
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 