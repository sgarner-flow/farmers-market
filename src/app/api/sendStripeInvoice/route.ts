import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

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
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-dashboard?success=true`,
      type: 'account_onboarding',
    });

    // Prepare and send email with the correct links
    const emailHtml = `
      <h1>Welcome to Flow Farmers Market!</h1>
      <p>Dear ${business_name},</p>
      <p>Your vendor application has been approved! Please complete these two important steps:</p>
      <ol>
        <li><strong>Pay Your Application Fee:</strong><br>
            <a href="${finalInvoice.hosted_invoice_url}">Click here to view and pay your invoice</a>
        </li>
        <li><strong>Set Up Your Payment Processing:</strong><br>
            <a href="${accountLink.url}">Click here to set up your Stripe account</a>
        </li>
      </ol>
      <p>Please complete both steps to finalize your application. The second link will take you directly to Stripe's secure setup process where you can configure your payment processing account.</p>
      <p>If you have any questions, please contact us at sgarns@gmail.com</p>
      <p>Best regards,<br>Flow Farmers Market Team</p>
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
        }
      };

      // Send email
      const result = await sgMail.send(msg);
      console.log('Email sent successfully:', result);

    } catch (emailError) {
      // Log the full error details
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