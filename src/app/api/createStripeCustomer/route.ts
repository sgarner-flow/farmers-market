import { NextResponse } from 'next/server';
import { createStripeClient } from '@/lib/stripe';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: Request) {
  try {
    console.log('createStripeCustomer endpoint called');
    
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
    
    const { name, email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create the customer in Stripe
    console.log(`Creating Stripe customer with email: ${email}`);
    const customer = await stripe.customers.create({
      name: name || undefined,
      email: email,
      metadata: {
        source: 'admin_card_issue'
      }
    });
    
    console.log('Customer created successfully:', customer.id);
    
    // Return the customer ID
    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Customer created successfully'
    });
    
  } catch (error: any) {
    console.error('Error creating customer:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
} 