import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { createStripeClient } from '@/lib/stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const specificAccount = url.searchParams.get('account');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching payment data for date: ${date}`);
    if (specificAccount) {
      console.log(`Looking for specific account: ${specificAccount}`);
    }

    // Parse the date parameter
    const selectedDate = new Date(date);
    
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

    // Fetch ALL connected accounts directly from Stripe
    console.log('Fetching connected accounts directly from Stripe');
    let stripeAccounts: Stripe.Account[] = [];
    if (specificAccount) {
      // If looking for a specific account, fetch just that one
      try {
        const account = await stripe.accounts.retrieve(specificAccount);
        stripeAccounts = [account];
        console.log(`Found specific account: ${account.id}`);
      } catch (err) {
        console.error(`Error retrieving specific account ${specificAccount}:`, err);
        stripeAccounts = [];
      }
    } else {
      // Otherwise fetch all connected accounts
      const accounts = await stripe.accounts.list({ limit: 100 });
      stripeAccounts = accounts.data;
      console.log(`Found ${stripeAccounts.length} connected accounts from Stripe`);
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

    // Direct lookup of the specified payment if provided
    let directPaymentResult = null;
    const paymentId = url.searchParams.get('payment');
    if (paymentId && specificAccount) {
      try {
        console.log(`Attempting direct lookup of payment: ${paymentId} on account: ${specificAccount}`);
        const payment = await stripe.paymentIntents.retrieve(
          paymentId,
          { stripeAccount: specificAccount }
        );
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

    // Fetch payment data for each connected account
    const vendorPaymentData = await Promise.all(
      stripeAccounts.map(async (account) => {
        try {
          // Look up vendor details from database, if available
          const vendorFromDb = vendorMap.get(account.id);
          const businessName = vendorFromDb?.business_name || 
                              (account.business_profile && account.business_profile.name) || 
                              `Account ${account.id}`;
          
          console.log(`Fetching payments for account: ${businessName} (${account.id})`);
          
          // First attempt - Get payment intents
          let paymentIntents = await stripe.paymentIntents.list(
            {
              created: {
                gte: startTimestamp,
                lte: endTimestamp,
              },
              limit: 100,
              expand: ['data.payment_method'],
            },
            {
              stripeAccount: account.id,
            }
          );
          
          console.log(`Found ${paymentIntents.data.length} payment intents for ${businessName}`);
          
          // If no payment intents found through the standard method, try a different approach
          // Fallback approach - Get charges directly
          if (paymentIntents.data.length === 0) {
            console.log(`Attempting to fetch charges directly for account: ${account.id}`);
            try {
              // Try fetching the charges directly
              const charges = await stripe.charges.list(
                {
                  created: {
                    gte: startTimestamp,
                    lte: endTimestamp,
                  },
                  limit: 100,
                },
                {
                  stripeAccount: account.id,
                }
              );
              
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
          
          // Log all found transactions in detail
          paymentIntents.data.forEach(pi => {
            const date = new Date(pi.created * 1000);
            console.log(`- Payment: ${pi.id}, Amount: ${pi.amount / 100}, Status: ${pi.status}, Created: ${date.toISOString()} (${date.toString()})`);
          });
          
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
          
          console.log(`After filtering for exact date, found ${filteredTransactions.length} transactions`);

          // Get the account's balance
          const balance = await stripe.balance.retrieve({
            stripeAccount: account.id,
          });

          // Calculate total payment volume and transaction count
          const totalVolume = filteredTransactions.reduce((sum, intent) => {
            // Only count succeeded payments
            if (intent.status === 'succeeded') {
              return sum + intent.amount;
            }
            return sum;
          }, 0) / 100; // Convert cents to dollars
          
          const succeededTransactions = filteredTransactions.filter(intent => intent.status === 'succeeded');
          const transactionCount = succeededTransactions.length;
          const averageTransactionSize = transactionCount > 0 ? totalVolume / transactionCount : 0;

          // Get hourly breakdown of activity
          const hourlyData = Array(24).fill(0).map((_, i) => ({
            hour: i,
            count: 0,
            volume: 0,
          }));

          succeededTransactions.forEach(intent => {
            const intentDate = new Date(intent.created * 1000);
            const hour = intentDate.getHours();
            hourlyData[hour].count += 1;
            hourlyData[hour].volume += intent.amount / 100; // Convert cents to dollars
          });

          // Show ALL transactions, not just successful ones, to help with debugging
          const allTransactions = filteredTransactions.map(intent => ({
            id: intent.id,
            amount: intent.amount / 100, // Convert cents to dollars
            status: intent.status,
            created: new Date(intent.created * 1000).toISOString(),
            payment_method: intent.payment_method_types[0] || 'unknown',
            receipt_url: intent.latest_charge ? `https://dashboard.stripe.com/${account.id}/payments/${intent.latest_charge}` : null,
          }));

          return {
            vendor: {
              id: vendorFromDb?.id || account.id,
              business_name: businessName,
              product_type: vendorFromDb?.product_type || 
                          (account.business_profile && account.business_profile.product_description) || 
                          'Unknown',
              email: vendorFromDb?.email || account.email || 'Unknown',
              stripe_account_id: account.id,
              status: vendorFromDb?.status || 'Connected Account',
            },
            summary: {
              total_volume: totalVolume,
              transaction_count: transactionCount,
              average_transaction_size: averageTransactionSize,
              available_balance: balance.available.reduce((sum, balance) => sum + balance.amount, 0) / 100, // Convert cents to dollars
              pending_balance: balance.pending.reduce((sum, balance) => sum + balance.amount, 0) / 100, // Convert cents to dollars
            },
            hourly_data: hourlyData,
            recent_transactions: allTransactions.slice(0, 10), // Show more transactions and all status types
          };
        } catch (error) {
          console.error(`Error fetching payment data for account ${account.id}:`, error);
          return {
            vendor: {
              id: account.id,
              business_name: (account.business_profile && account.business_profile.name) || `Account ${account.id}`,
              product_type: (account.business_profile && account.business_profile.product_description) || 'Unknown',
              email: account.email || 'Unknown',
              stripe_account_id: account.id,
              status: 'Connected Account',
            },
            summary: {
              total_volume: 0,
              transaction_count: 0,
              average_transaction_size: 0,
              available_balance: 0,
              pending_balance: 0,
            },
            hourly_data: Array(24).fill(0).map((_, i) => ({
              hour: i,
              count: 0,
              volume: 0,
            })),
            recent_transactions: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      date: selectedDate.toISOString(),
      vendors: vendorPaymentData,
      directPaymentResult: directPaymentResult,
    });
    
  } catch (error: any) {
    console.error('Error in getVendorPayments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 