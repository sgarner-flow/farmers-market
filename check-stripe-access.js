require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Init Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkStripeAccess() {
  try {
    // 1. Get current API key information
    console.log("🔑 Checking Stripe API key...");
    
    try {
      const keyInfo = await stripe.apiKeys.retrievePublishableKey();
      console.log(`✅ API Key is valid: ${keyInfo.type} key`);
      console.log(`  - Created: ${new Date(keyInfo.created * 1000).toISOString()}`);
      console.log(`  - Livemode: ${keyInfo.livemode}`);
    } catch (err) {
      // Can't get key info, but still might be valid for some operations
      console.log(`⚠️ Cannot retrieve key info: ${err.message}`);
    }
    
    // 2. Check which accounts we have access to
    console.log("\n🏢 Connected Accounts accessible with this key:");
    
    const accounts = await stripe.accounts.list({ limit: 100 });
    
    if (accounts.data.length === 0) {
      console.log("❌ No connected accounts found with this key.");
    } else {
      accounts.data.forEach((account, index) => {
        console.log(`${index + 1}. ${account.id} - ${account.business_profile?.name || 'Unnamed'} (${account.email || 'no email'})`);
        console.log(`   Type: ${account.type}, Created: ${new Date(account.created * 1000).toISOString()}`);
      });
    }
    
    // 3. Check core Stripe account
    console.log("\n🏛️ Main Stripe Account Information:");
    
    try {
      const balance = await stripe.balance.retrieve();
      console.log("✅ Can access balance - this key has access to the main account");
      
      // Available balance
      const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100;
      // Pending balance
      const pending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100;
      
      console.log(`  - Available balance: $${available.toFixed(2)}`);
      console.log(`  - Pending balance: $${pending.toFixed(2)}`);
    } catch (err) {
      console.log(`❌ Cannot access balance: ${err.message}`);
      console.log("   This key may only have access to connected accounts.");
    }
    
    // 4. Check customers
    try {
      const customers = await stripe.customers.list({ limit: 3 });
      console.log(`\n👥 Found ${customers.total_count} customers (showing first 3):`);
      customers.data.forEach((customer, i) => {
        console.log(`  ${i+1}. ${customer.id} - ${customer.name || customer.email || 'Unnamed'}`);
      });
    } catch (err) {
      console.log(`\n❌ Cannot access customers: ${err.message}`);
    }
    
  } catch (err) {
    console.error(`\n❌ Stripe access check failed: ${err.message}`);
  }
}

// Run the check
checkStripeAccess().catch(console.error); 