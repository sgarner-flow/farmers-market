require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Init Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Approved accounts to keep
const approvedAccounts = new Set([
  'acct_1R9VFgFJBDvSq37M',
  'acct_1RAfvcFMgG3IQCnA',
  'acct_1RAtq5FMOvZgidQI',
]);

// Get account IDs from command line: node clean-additional-accounts.js acct_123 acct_456
const accountIdsToDelete = process.argv.slice(2).filter(id => !approvedAccounts.has(id));

if (accountIdsToDelete.length === 0) {
  console.log('Please provide Stripe account IDs to delete as command line arguments.');
  console.log('Usage: node clean-additional-accounts.js acct_123 acct_456 ...');
  process.exit(1);
}

async function verifyAndDeleteAccounts(accountIds) {
  console.log(`Preparing to delete ${accountIds.length} accounts...`);
  
  for (const id of accountIds) {
    if (approvedAccounts.has(id)) {
      console.log(`⚠️ Skipping protected account: ${id}`);
      continue;
    }
    
    // First verify the account exists
    try {
      const account = await stripe.accounts.retrieve(id);
      console.log(`Found account: ${id} - ${account.business_profile?.name || 'Unnamed'} (${account.email || 'no email'})`);
      
      const confirmDelete = !process.argv.includes('--force');
      if (confirmDelete) {
        console.log(`⚠️ To delete this account, re-run with --force flag`);
      } else {
        // Delete the account
        await stripe.accounts.del(id);
        console.log(`✅ Deleted account: ${id}`);
      }
    } catch (err) {
      console.error(`❌ Error with account ${id}: ${err.message}`);
    }
  }
}

// Execute
(async () => {
  try {
    console.log("🔍 Accounts to delete:");
    accountIdsToDelete.forEach(id => console.log(`- ${id}`));
    
    if (!process.argv.includes('--force')) {
      console.log("\n⚠️ This is a dry run. Re-run with --force to actually delete accounts.");
    } else {
      console.log("\n⚠️ Proceeding with deletion using --force flag");
    }
    
    await verifyAndDeleteAccounts(accountIdsToDelete);
    
    console.log("\n✅ Operation complete");
  } catch (err) {
    console.error('❌ Script failed:', err.message);
  }
})(); 