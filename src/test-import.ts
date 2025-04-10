e// Simple test file to check if the imports work correctly
import { createStripeClient, issueVirtualCard, CardholderData } from './lib/stripe';

// Just declare variables with the imported types to verify they work
const testFn = () => {
  console.log('Testing imports');
  const client = createStripeClient('dummy_key');
  const cardholderData: CardholderData = {
    name: 'Test User',
    email: 'test@example.com',
    billing: {
      address: {
        line1: '123 Main St',
        city: 'Miami',
        state: 'FL',
        postal_code: '33132',
        country: 'US'
      }
    }
  };
  
  // This is just for type checking, we won't actually call this
  if (false) {
    issueVirtualCard(client, 'customer_id', cardholderData);
  }
};

export default testFn; 