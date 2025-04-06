import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { createStripeClient } from '@/lib/stripe';

// Check for Stripe API key - don't throw during build time
const stripe = process.env.STRIPE_SECRET_KEY 
  ? createStripeClient(process.env.STRIPE_SECRET_KEY)
  : null;

// Increased timeout for Stripe API requests (in milliseconds)
const STRIPE_REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 30000 : 60000; // 30 seconds in production, 60 in dev

export async function GET(request: Request) {
  console.log('getVendorPayments endpoint called');
  
  try {
    // Verify Stripe client is initialized at runtime
    if (!stripe) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not set' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const specificAccount = url.searchParams.get('account');
    const paymentId = url.searchParams.get('payment');
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!date) {
      console.error('Date parameter is missing');
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching payment data for date: ${date}, page: ${page}, limit: ${limit}`);
    if (specificAccount) {
      console.log(`Looking for specific account: ${specificAccount}`);
    }

    // Parse the date parameter
    const selectedDate = new Date(date);
    console.log(`Selected date parsed as: ${selectedDate.toISOString()}`);
    
    // Add buffer to start and end time to account for timezone issues
    // Start 12 hours before the start of the selected day in local time
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(-12, 0, 0, 0);
    
    // End 12 hours after the end of the selected day in local time
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(35, 59, 59, 999);

    // Unix timestamps for Stripe API
    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

    console.log(`Extended date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    console.log(`Timestamps: ${startTimestamp} to ${endTimestamp}`);

    // Direct lookup of the specified payment if provided
    let directPaymentResult = null;
    if (paymentId && specificAccount) {
      try {
        console.log(`Attempting direct lookup of payment: ${paymentId} on account: ${specificAccount}`);
        const payment = await Promise.race([
          stripe.paymentIntents.retrieve(
            paymentId,
            { stripeAccount: specificAccount }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Payment retrieval timeout')), STRIPE_REQUEST_TIMEOUT)
          )
        ]) as Stripe.PaymentIntent;
        
        directPaymentResult = {
          id: payment.id,
          amount: payment.amount / 100,
          status: payment.status,
          created: new Date(payment.created * 1000).toISOString(),
          account: specificAccount
        };
        console.log(`Found payment directly: ${JSON.stringify(directPaymentResult)}`);
      } catch (err) {
        console.error(`Error looking up payment directly:`, err);
      }
    }

    // If only looking up a specific payment, return early
    if (paymentId && specificAccount && directPaymentResult) {
      return NextResponse.json({
        success: true,
        date: selectedDate.toISOString(),
        vendors: [],
        directPaymentResult,
      });
    }

    // Fetch connected accounts (with pagination if not looking for a specific account)
    console.log('Fetching connected accounts from Stripe');
    let stripeAccounts: Stripe.Account[] = [];
    
    try {
      if (specificAccount) {
        // If looking for a specific account, fetch just that one
        try {
          const account = await Promise.race([
            stripe.accounts.retrieve(specificAccount),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Account retrieval timeout')), STRIPE_REQUEST_TIMEOUT)
            )
          ]) as Stripe.Account;
          
          stripeAccounts = [account];
          console.log(`Found specific account: ${account.id}`);
        } catch (err) {
          console.error(`Error retrieving specific account ${specificAccount}:`, err);
          stripeAccounts = [];
        }
      } else {
        // Otherwise fetch accounts with pagination
        const accounts = await Promise.race([
          stripe.accounts.list({ 
            limit: limit,
            starting_after: page > 1 ? url.searchParams.get('last_account_id') || undefined : undefined
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Accounts listing timeout')), STRIPE_REQUEST_TIMEOUT)
          )
        ]) as Stripe.ApiList<Stripe.Account>;
        
        stripeAccounts = accounts.data;
        console.log(`Found ${stripeAccounts.length} connected accounts from Stripe (page ${page})`);
      }
    } catch (stripeError) {
      console.error('Error fetching Stripe accounts:', stripeError);
      return NextResponse.json(
        { error: 'Failed to fetch Stripe accounts' },
        { status: 500 }
      );
    }

    if (stripeAccounts.length === 0) {
      console.log('No Stripe accounts found');
      return NextResponse.json({
        success: true,
        date: selectedDate.toISOString(),
        vendors: [],
        directPaymentResult,
        message: 'No vendor accounts found',
        hasMore: false,
        page
      });
    }
    
    // Map Stripe accounts to vendor info
    const supabase = createServerClient();
    
    // Create a map of Stripe account IDs to vendor details from our database
    const { data: allVendors, error: vendorsError } = await supabase
      .from('vendor_applications')
      .select('*')
      .not('stripe_account_id', 'is', null);
    
    if (vendorsError) {
      console.error('Error fetching vendors from database:', vendorsError);
    }

    const vendorMap = new Map();
    allVendors?.forEach(vendor => {
      if (vendor.stripe_account_id) {
        vendorMap.set(vendor.stripe_account_id, vendor);
      }
    });

    // Limit the number of concurrent requests to avoid timeouts
    const BATCH_SIZE = 3; // Process only 3 accounts at a time (reduced from 5)
    
    console.log(`Processing ${stripeAccounts.length} accounts in batches of ${BATCH_SIZE}`);
    
    let vendorPaymentData: any[] = [];
    
    // Special handling for high-volume dates
    const isHighVolumeDate = (date: Date) => {
      // April 6th appears to be a high-volume date
      const d = new Date(date);
      return d.getMonth() === 3 && d.getDate() === 6; // April is month 3 (0-indexed)
    };

    // Apply stricter limits for known high-volume dates
    const PAYMENT_FETCH_LIMIT = isHighVolumeDate(selectedDate) 
      ? 20  // Reduced limit for high-volume dates
      : 50; // Normal limit for regular dates

    console.log(`Using payment fetch limit of ${PAYMENT_FETCH_LIMIT} for date ${selectedDate.toISOString()}`);

    // Additional optimization: For high-volume dates, prefer to get summary data only
    if (isHighVolumeDate(selectedDate)) {
      console.log('High volume date detected - using optimized fetching strategy');
    }

    // Process in small batches to avoid overwhelming Stripe API
    for (let i = 0; i < stripeAccounts.length; i += BATCH_SIZE) {
      const batch = stripeAccounts.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} with ${batch.length} accounts`);
      
      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (account) => {
          try {
            // Look up vendor details from database, if available
            const vendorFromDb = vendorMap.get(account.id);
            const businessName = vendorFromDb?.business_name || 
                                (account.business_profile && account.business_profile.name) || 
                                `Account ${account.id}`;
            
            console.log(`Fetching payments for account: ${businessName} (${account.id})`);
            
            // Additional optimization: For high-volume dates, prefer to get summary data only
            if (isHighVolumeDate(selectedDate)) {
              console.log('High volume date detected - using optimized fetching strategy');
            }

            // First attempt - Get payment intents with timeout
            let paymentIntents;
            try {
              paymentIntents = await Promise.race([
                stripe.paymentIntents.list(
                  {
                    created: {
                      gte: startTimestamp,
                      lte: endTimestamp,
                    },
                    limit: PAYMENT_FETCH_LIMIT,
                  },
                  {
                    stripeAccount: account.id,
                  }
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Payment intents listing timeout')), STRIPE_REQUEST_TIMEOUT)
                )
              ]) as Stripe.ApiList<Stripe.PaymentIntent>;
              
              console.log(`Found ${paymentIntents.data.length} payment intents for ${businessName}`);
            } catch (paymentError) {
              console.error(`Error fetching payment intents for ${account.id}:`, paymentError);
              paymentIntents = { data: [] };
            }
            
            // If no payment intents found through the standard method, try a different approach
            // Fallback approach - Get charges directly
            if (paymentIntents.data.length === 0) {
              console.log(`Attempting to fetch charges directly for account: ${account.id}`);
              try {
                // Try fetching the charges directly with timeout
                const charges = await Promise.race([
                  stripe.charges.list(
                    {
                      created: {
                        gte: startTimestamp,
                        lte: endTimestamp,
                      },
                      limit: PAYMENT_FETCH_LIMIT,
                    },
                    {
                      stripeAccount: account.id,
                    }
                  ),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Charges listing timeout')), STRIPE_REQUEST_TIMEOUT)
                  )
                ]) as Stripe.ApiList<Stripe.Charge>;
                
                console.log(`Found ${charges.data.length} charges directly for ${businessName}`);
                
                // If charges are found, convert them to a payment intent format for consistency
                if (charges.data.length > 0) {
                  charges.data.forEach(charge => 
                    console.log(`- Charge: ${charge.id}, Amount: ${charge.amount / 100}, Status: ${charge.status}, Created: ${new Date(charge.created * 1000).toISOString()}`)
                  );
                  
                  // Convert charges to a format compatible with our payment processing
                  paymentIntents.data = charges.data.map(charge => ({
                    id: charge.payment_intent || charge.id,
                    amount: charge.amount,
                    status: charge.status === 'succeeded' ? 'succeeded' : charge.status,
                    created: charge.created,
                    payment_method_types: [charge.payment_method_details?.type || 'unknown'],
                    latest_charge: charge.id
                  })) as any;
                }
              } catch (chargeErr) {
                console.error(`Error fetching charges for account ${account.id}:`, chargeErr);
              }
            }
            
            // Filter transactions to only include those from the actual requested date
            // (after expanding for timezone, we need to filter back)
            const originalDay = selectedDate.getDate();
            const originalMonth = selectedDate.getMonth();
            const originalYear = selectedDate.getFullYear();
            
            const filteredTransactions = paymentIntents.data.filter(intent => {
              const txDate = new Date(intent.created * 1000);
              return txDate.getDate() === originalDay && 
                    txDate.getMonth() === originalMonth && 
                    txDate.getFullYear() === originalYear;
            });
            
            console.log(`After filtering for exact date, found ${filteredTransactions.length} transactions for ${businessName}`);

            // Get the account's balance with timeout
            let balance: Stripe.Balance;
            try {
              balance = await Promise.race([
                stripe.balance.retrieve({ stripeAccount: account.id }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Balance retrieval timeout')), STRIPE_REQUEST_TIMEOUT)
                )
              ]) as Stripe.Balance;
            } catch (balanceError) {
              console.error(`Error fetching balance for account ${account.id}:`, balanceError);
              balance = { 
                object: 'balance',
                available: [],
                pending: [],
                connect_reserved: [] as any,
                instant_available: [] as any,
                issuing: {} as any,
                livemode: true
              };
            }

            // Aggregate transactions data for this vendor by hour
            const hourlyData = Array(24).fill(0).map((_, hour) => ({
              hour,
              count: 0,
              volume: 0,
            }));

            // Process transactions and populate hourly data
            filteredTransactions.forEach(transaction => {
              const txDate = new Date(transaction.created * 1000);
              const hour = txDate.getHours();
              
              // Only include successful transactions in the hourly data
              if (transaction.status === 'succeeded') {
                hourlyData[hour].count += 1;
                hourlyData[hour].volume += transaction.amount / 100;
              }
            });

            // Select only a sample of recent transactions to avoid overwhelming the response
            const recentTransactions = filteredTransactions
              .slice(0, 10)  // Limit to 10 most recent
              .map(tx => ({
                id: tx.id,
                amount: tx.amount / 100,
                status: tx.status,
                created: new Date(tx.created * 1000).toISOString(),
                payment_method: Array.isArray(tx.payment_method_types) 
                  ? tx.payment_method_types[0]
                  : 'unknown',
                receipt_url: null, // Skip receipt URLs to reduce response size
              }));

            // Calculate summary data
            const successfulTransactions = filteredTransactions.filter(tx => tx.status === 'succeeded');
            const totalVolume = successfulTransactions.reduce((sum, tx) => sum + (tx.amount / 100), 0);

            // Calculate available and pending balances
            const availableBalance = balance.available.reduce((sum, balance) => sum + balance.amount / 100, 0);
            const pendingBalance = balance.pending.reduce((sum, balance) => sum + balance.amount / 100, 0);
            
            return {
              vendor: {
                id: vendorFromDb?.id || account.id,
                business_name: businessName,
                product_type: vendorFromDb?.product_type || 'Unknown',
                email: vendorFromDb?.email || account.email || 'No email',
                stripe_account_id: account.id,
                status: vendorFromDb?.status || 'active',
              },
              summary: {
                total_volume: totalVolume,
                transaction_count: successfulTransactions.length,
                average_transaction_size: successfulTransactions.length > 0 
                  ? totalVolume / successfulTransactions.length 
                  : 0,
                available_balance: availableBalance,
                pending_balance: pendingBalance,
              },
              hourly_data: hourlyData,
              recent_transactions: recentTransactions,
            };
          } catch (vendorError) {
            console.error(`Error processing vendor ${account.id}:`, vendorError);
            return {
              vendor: {
                id: account.id,
                business_name: `Account ${account.id}`,
                product_type: 'Unknown',
                email: 'No email',
                stripe_account_id: account.id,
                status: 'error',
              },
              summary: {
                total_volume: 0,
                transaction_count: 0,
                average_transaction_size: 0,
                available_balance: 0,
                pending_balance: 0,
              },
              hourly_data: Array(24).fill(0).map((_, hour) => ({ hour, count: 0, volume: 0 })),
              recent_transactions: [],
              error: 'Error fetching vendor data',
            };
          }
        })
      );
      
      // Add results from this batch
      vendorPaymentData = [...vendorPaymentData, ...batchResults.filter(Boolean)];
    }

    // Get the ID of the last account for pagination
    const lastAccountId = stripeAccounts.length > 0 
      ? stripeAccounts[stripeAccounts.length - 1].id 
      : null;

    // Apply additional optimizations for high-volume dates in the response
    if (isHighVolumeDate(selectedDate)) {
      console.log('Applying high-volume date optimizations to response data');
      
      // For high-volume dates, trim down the response data
      vendorPaymentData = vendorPaymentData.map(vendor => ({
        vendor: vendor.vendor,
        summary: vendor.summary,
        // Include only hours that have transactions to reduce payload size
        hourly_data: vendor.hourly_data.filter((hour: { count: number; volume: number }) => hour.count > 0 || hour.volume > 0),
        // Include only the most recent 5 transactions
        recent_transactions: vendor.recent_transactions.slice(0, 5)
      }));
    }

    // Sort vendors by total transaction volume (highest to lowest)
    vendorPaymentData.sort((a, b) => b.summary.total_volume - a.summary.total_volume);

    // Return the results
    return NextResponse.json({
      success: true,
      date: selectedDate.toISOString(),
      vendors: vendorPaymentData,
      directPaymentResult,
      hasMore: !specificAccount && stripeAccounts.length === limit,
      page,
      lastAccountId
    });
    
  } catch (error) {
    console.error('Unexpected error in getVendorPayments:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
} 