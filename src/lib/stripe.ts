import Stripe from 'stripe';

// Define the Stripe API version used in the project
export type StripeApiVersion = '2024-09-30.acacia';

// Create a Stripe client that can work with the current version
export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    // Cast to any to bypass TypeScript's strict checking of the API version
    apiVersion: '2024-09-30.acacia' as any,
  });
} 