require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Account ID to create account link for
const ACCOUNT_ID = 'acct_1R9VFgFJBDvSq37M';

// Initialize Stripe with secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createAccountLink() {
  try {
    console.log(`Creating account update link for: ${ACCOUNT_ID}`);
    
    // Create an account link for the connected account
    const accountLink = await stripe.accountLinks.create({
      account: ACCOUNT_ID,
      refresh_url: 'https://flowfarmersmarket.vercel.app/dashboard',
      return_url: 'https://flowfarmersmarket.vercel.app/dashboard',
      type: 'account_onboarding',  // Use 'account_onboarding' for full account setup
    });
    
    console.log('\nSuccess! Account update link created:');
    console.log(accountLink.url);
    console.log('\nYou can share this link with the account owner to update their account details.');
    console.log('Note: This link expires in 24 hours.');
    
  } catch (error) {
    console.error('Error creating account link:', error.message);
    
    if (error.message.includes('no such account')) {
      console.log('\nThe account ID may be incorrect or the account may not exist in your Stripe account.');
    } else if (error.message.includes('authentication')) {
      console.log('\nCheck that your STRIPE_SECRET_KEY in .env.local is correct.');
    }
  }
}

// Execute
createAccountLink(); 