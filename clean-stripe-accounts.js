require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Init Supabase + Stripe
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Approved accounts to keep
const approvedAccounts = new Set([
  'acct_1R9VFgFJBDvSq37M',
  'acct_1RAfvcFMgG3IQCnA',
  'acct_1RAtq5FMOvZgidQI',
]);

// First, let's just find the specific accounts and check if they exist
async function checkSpecificAccounts() {
  console.log("Checking for specific accounts in Stripe...");
  
  for (const accountId of approvedAccounts) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      console.log(`✅ Found account: ${accountId} - ${account.business_profile?.name || 'Unknown name'}`);
    } catch (err) {
      console.error(`❌ Account not found: ${accountId} - ${err.message}`);
    }
  }
}

async function getAllStripeAccounts() {
  console.log("Fetching ALL accounts directly from Stripe...");
  
  let allAccounts = [];
  let hasMore = true;
  let startingAfter = null;
  
  // Just use a single approach for listing accounts with proper pagination
  hasMore = true;
  startingAfter = null;
  
  // Paginate through all accounts
  while (hasMore) {
    const params = { limit: 100 };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    
    try {
      const accounts = await stripe.accounts.list(params);
      
      // Log accounts with their business names for better visibility
      accounts.data.forEach(account => {
        console.log(`  - ${account.id} - ${account.business_profile?.name || 'Unnamed'} (${account.email || 'no email'})`);
      });
      
      // Add accounts to our list
      allAccounts = [...allAccounts, ...accounts.data];
      
      // Check if we need to paginate more
      hasMore = accounts.has_more;
      if (hasMore && accounts.data.length > 0) {
        startingAfter = accounts.data[accounts.data.length - 1].id;
      }
      
      console.log(`Fetched ${accounts.data.length} accounts, total now: ${allAccounts.length}, has_more: ${hasMore}`);
    } catch (err) {
      console.error(`Error fetching accounts: ${err.message}`);
      hasMore = false; // Stop on error
    }
  }
  
  // Print all found accounts for verification
  console.log("\nAll accounts found:");
  allAccounts.forEach((account, index) => {
    const isKeeping = approvedAccounts.has(account.id);
    const prefix = isKeeping ? "🟢" : "🔴";
    console.log(`${prefix} ${index + 1}. ${account.id} - ${account.business_profile?.name || 'Unnamed'} (${account.email || 'no email'})`);
  });
  
  return allAccounts;
}

async function getAccountsToDelete() {
  // First get accounts from Supabase
  const { data, error } = await supabase
    .from('vendor_applications')
    .select('stripe_account_id');

  if (error) throw new Error('❌ Supabase fetch error: ' + error.message);

  const accountsFromDb = data
    .map(entry => entry.stripe_account_id)
    .filter(id => id && !approvedAccounts.has(id));
    
  console.log(`Found ${accountsFromDb.length} accounts to delete from database`);
  
  // Then get ALL accounts from Stripe
  const allStripeAccounts = await getAllStripeAccounts();
  const allStripeAccountIds = allStripeAccounts.map(account => account.id);
  
  // Combine both sources and remove duplicates
  const allAccountsToDelete = [...new Set([
    ...accountsFromDb,
    ...allStripeAccountIds.filter(id => !approvedAccounts.has(id))
  ])];
  
  console.log(`Found ${allAccountsToDelete.length} total unique accounts to delete`);
  
  return allAccountsToDelete;
}

async function deleteAccounts(accountIds) {
  for (const id of accountIds) {
    try {
      const result = await stripe.accounts.del(id);
      console.log(`✅ Deleted: ${id}`);
    } catch (err) {
      console.error(`❌ Failed to delete ${id}:`, err.message);
    }
  }
}

(async () => {
  try {
    // First check if we can access the specific accounts
    await checkSpecificAccounts();
    
    // Then get accounts to delete
    const toDelete = await getAccountsToDelete();
    console.log(`🔍 Found ${toDelete.length} accounts to delete.`);
    
    // Add confirmation step
    console.log('⚠️ WARNING: This script will DELETE the following Stripe accounts:');
    console.log(toDelete);
    console.log('If you want to proceed, run this script with the --confirm flag');
    
    // Only proceed if --confirm flag is set
    if (process.argv.includes('--confirm')) {
      console.log('⚠️ Proceeding with deletion...');
      await deleteAccounts(toDelete);
      console.log('✅ Cleanup complete');
    } else {
      console.log('❌ Operation cancelled. No accounts were deleted.');
    }
  } catch (err) {
    console.error('❌ Script failed:', err.message);
  }
})(); 