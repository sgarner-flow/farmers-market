require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Account ID to update
const ACCOUNT_ID = 'acct_1R9VFgFJBDvSq37M';
// Email to add
const EMAIL = 'sgarns@gmail.com';  // Customer email

// Function to update the account
async function updateAccount() {
  try {
    // Use the local server explicitly
    const baseUrl = 'http://localhost:3007';
    
    // Construct the API URL
    const apiUrl = `${baseUrl}/api/updateStripeAccount`;
    console.log(`Making API request to: ${apiUrl}`);
    
    // Call the API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: ACCOUNT_ID,
        email: EMAIL,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update account');
    }
    
    console.log('Success! Account has been updated.');
    console.log('Login Link:', result.url);
    console.log('\nYou can share this login link with the customer for direct access to their Stripe Dashboard.');
    console.log('Note: This link expires after 5 minutes. If needed, generate a new one.');
    
  } catch (error) {
    console.error('Error updating account:', error.message);
  }
}

// Execute the update
updateAccount(); 