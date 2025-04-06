require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Account ID to create login link for
const ACCOUNT_ID = 'acct_1R9VFgFJBDvSq37M';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createLoginLink() {
  try {
    console.log(`Creating login link for account: ${ACCOUNT_ID}`);
    
    // Create login link
    const loginLink = await stripe.accounts.createLoginLink(ACCOUNT_ID);
    
    console.log('\nSuccess! Login link created:');
    console.log(loginLink.url);
    console.log('\nYou can share this login link with the customer for direct access to their Stripe Dashboard.');
    console.log('Note: This link expires after 5 minutes. If needed, generate a new one.');
    
    // Also print instructions for updating email
    console.log('\n------------------------------------------');
    console.log('To update the email address for this account:');
    console.log('1. Log in to your Stripe dashboard');
    console.log('2. Go to Connect > Accounts');
    console.log('3. Find the account with ID', ACCOUNT_ID);
    console.log('4. Click on "View account"');
    console.log('5. Click on "Settings"');
    console.log('6. Update the email address');
    console.log('7. Save changes');
    console.log('------------------------------------------');
    
  } catch (error) {
    console.error('Error creating login link:', error.message);
    
    if (error.message.includes('no such account')) {
      console.log('\nThe account ID may be incorrect or the account may not exist in your Stripe account.');
    } else if (error.message.includes('authentication')) {
      console.log('\nCheck that your STRIPE_SECRET_KEY in .env.local is correct.');
    }
  }
}

// Execute
createLoginLink(); 