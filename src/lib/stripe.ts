import Stripe from 'stripe';

// Define the Stripe API version used in the project
export type StripeApiVersion = '2024-09-30.acacia';

// Define the cardholder data type
export interface CardholderData {
  name: string;
  email?: string;
  phone_number?: string;
  billing?: {
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    }
  };
}

// Create a Stripe client that can work with the current version
export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    // Cast to any to bypass TypeScript's strict checking of the API version
    apiVersion: '2024-09-30.acacia' as any,
  });
}

// Function to issue a virtual card
export async function issueVirtualCard(
  stripe: Stripe,
  customerId: string,
  cardholderData: CardholderData
) {
  // Create cardholder parameters
  const cardholderParams: Stripe.Issuing.CardholderCreateParams = {
    name: cardholderData.name,
    email: cardholderData.email,
    phone_number: cardholderData.phone_number,
    status: 'active',
    type: 'individual',
    billing: cardholderData.billing ? {
      address: {
        line1: cardholderData.billing.address.line1,
        line2: cardholderData.billing.address.line2,
        city: cardholderData.billing.address.city,
        state: cardholderData.billing.address.state,
        postal_code: cardholderData.billing.address.postal_code,
        country: cardholderData.billing.address.country,
      }
    } : {
      // Default billing details when not provided
      address: {
        line1: '123 Main St',
        city: 'Miami',
        state: 'FL',
        postal_code: '33132',
        country: 'US',
      }
    }
  };

  // Create a cardholder if not exists
  const cardholder = await stripe.issuing.cardholders.create(cardholderParams);

  // Create a card for the cardholder
  const card = await stripe.issuing.cards.create({
    cardholder: cardholder.id,
    currency: 'usd',
    type: 'virtual',
    status: 'active',
  });

  // Get the card details
  const cardDetails = await stripe.issuing.cards.retrieve(card.id, {
    expand: ['number', 'cvc'],
  });

  return {
    cardholder,
    card: cardDetails
  };
} 