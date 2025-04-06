import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createStripeClient } from '@/lib/stripe';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

export async function GET(request: Request) {
  try {
    // Get the account ID from the query string
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-dashboard?error=missing_account_id`
      );
    }

    // Check if Stripe is initialized
    if (!stripe) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-dashboard?error=stripe_configuration`
      );
    }

    // Create a new account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/refreshStripeLink?accountId=${accountId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-apply-complete?success=true`,
      type: 'account_onboarding',
    });

    // Update the account link in the database
    const supabase = createServerClient();
    
    const { data: application, error: fetchError } = await supabase
      .from('vendor_applications')
      .select('id')
      .eq('stripe_account_id', accountId)
      .single();

    if (!fetchError && application) {
      await supabase
        .from('vendor_applications')
        .update({
          account_setup_link: accountLink.url
        })
        .eq('id', application.id);
    }

    // Redirect to the new account link
    return NextResponse.redirect(accountLink.url);
  } catch (error: any) {
    console.error('Error refreshing Stripe account link:', error);
    
    // Redirect to vendor dashboard with error
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor-dashboard?error=refresh_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`
    );
  }
} 