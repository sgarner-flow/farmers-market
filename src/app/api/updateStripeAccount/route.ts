import { NextResponse } from 'next/server';
import { createStripeClient } from '@/lib/stripe';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: Request) {
  try {
    console.log('updateStripeAccount endpoint called');
    
    // Verify Stripe client is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not set' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { accountId, email } = body;
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Update the connected account with the email
    console.log(`Updating Stripe connected account ${accountId} with email: ${email}`);
    
    const updatedAccount = await stripe.accounts.update(accountId, {
      email: email,
    });
    
    console.log('Account updated successfully');
    
    // Create a login link for the account
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    
    // Return success response with the login link
    return NextResponse.json({
      success: true,
      message: 'Account updated with email and login link created',
      accountId: accountId,
      url: loginLink.url
    });
    
  } catch (error: any) {
    console.error('Error updating Stripe account:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to update account' },
      { status: 500 }
    );
  }
} 