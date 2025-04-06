require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Remove hardcoded account ID since we'll check all accounts
// const ACCOUNT_ID = 'acct_1RAtq5FMOvZgidQI'; 
const TODAY = new Date();
// Get date range from 2 days ago until today to catch recent transactions
const START_DATE = Math.floor((TODAY.getTime() - (48 * 60 * 60 * 1000)) / 1000);

async function checkAllConnectedAccounts() {
  console.log("🔍 Retrieving all connected accounts...");
  
  try {
    // First get all connected accounts
    const accounts = await stripe.accounts.list({
      limit: 100,
    });
    
    console.log(`✅ Found ${accounts.data.length} connected accounts\n`);
    
    // Check each account
    for (const account of accounts.data) {
      console.log(`\n======= ACCOUNT: ${account.id} =======`);
      console.log(`Business: ${account.business_profile?.name || 'Unnamed'}`);
      console.log(`Email: ${account.email || 'No email'}`);
      console.log(`Status: ${account.charges_enabled ? 'Active' : 'Inactive'} for charges`);
      console.log(`Created: ${new Date(account.created * 1000).toLocaleDateString()}\n`);
      
      await checkAccountPayments(account.id);
      
      console.log("\n======= END ACCOUNT =======\n");
    }
    
  } catch (err) {
    console.error(`❌ Error listing accounts: ${err.message}`);
  }
}

async function checkAccountPayments(accountId) {
  try {
    // 2. Check payment intents created for this account
    console.log("🔄 Checking payment intents transferred to this account...");
    
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: START_DATE }
    });
    
    // Filter for payment intents with the transfer_data.destination matching our account
    const accountPayments = paymentIntents.data.filter(
      pi => pi.transfer_data && pi.transfer_data.destination === accountId
    );
    
    if (accountPayments.length === 0) {
      console.log("❌ No payment intents found with transfers to this account");
    } else {
      console.log(`✅ Found ${accountPayments.length} payment intents for this account:`);
      accountPayments.forEach((pi, i) => {
        console.log(`  ${i+1}. ${pi.id} - $${(pi.amount/100).toFixed(2)} - Status: ${pi.status}`);
      });
    }
    
    // 3. Check transfers directly
    console.log("\n💸 Checking transfers to this account...");
    
    const transfers = await stripe.transfers.list({
      destination: accountId,
      limit: 100,
      created: { gte: START_DATE }
    });
    
    if (transfers.data.length === 0) {
      console.log("❌ No transfers found to this account");
    } else {
      console.log(`✅ Found ${transfers.data.length} transfers to this account:`);
      transfers.data.forEach((transfer, i) => {
        console.log(`  ${i+1}. ${transfer.id} - $${(transfer.amount/100).toFixed(2)} - Created: ${new Date(transfer.created * 1000).toISOString()}`);
      });
    }
    
    // 4. Check if the account has charges directly
    console.log("\n💳 Checking charges created directly on this account...");
    
    try {
      const charges = await stripe.charges.list({ 
        limit: 100,
        created: { gte: START_DATE }
      }, {
        stripeAccount: accountId  // This is key - we're using the connected account's API access
      });
      
      if (charges.data.length === 0) {
        console.log("❌ No charges found on this connected account");
      } else {
        console.log(`✅ Found ${charges.data.length} charges on this account:`);
        charges.data.forEach((charge, i) => {
          console.log(`  ${i+1}. ${charge.id} - $${(charge.amount/100).toFixed(2)} - Status: ${charge.status}`);
        });
      }
    } catch (err) {
      console.log(`❌ Error checking charges: ${err.message}`);
    }
    
    // 5. Check balances to see if money actually reached the account
    console.log("\n💰 Checking balance transactions on this account...");
    
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId
      });
      
      console.log("Available balance:");
      balance.available.forEach(bal => {
        console.log(`  ${bal.currency}: $${(bal.amount/100).toFixed(2)}`);
      });
      
      console.log("Pending balance:");
      balance.pending.forEach(bal => {
        console.log(`  ${bal.currency}: $${(bal.amount/100).toFixed(2)}`);
      });
      
    } catch (err) {
      console.log(`❌ Error checking balance: ${err.message}`);
    }
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

// Run the check for all accounts
checkAllConnectedAccounts().catch(console.error); 