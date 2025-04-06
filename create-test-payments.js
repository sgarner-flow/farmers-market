require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const testData = [
  {
    account: 'acct_1RAtq5FMOvZgidQI', // Very Successful
    charges: [1100, 2350, 899, 4050, 1200, 1800, 2500, 600, 1450, 700]
  },
  {
    account: 'acct_1RAfvcFMgG3IQCnA', // Not Very Successful
    charges: [300, 450]
  },
  {
    account: 'acct_1R9VFgFJBDvSq37M', // Medium Successful
    charges: [1250, 750, 2000, 890, 650]
  }
];

// Create a payment on behalf of the connected account
async function createTestPayment(accountId, amount) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
      confirm: true,
      payment_method: 'pm_card_visa', // test card
      description: 'Test payment',
      transfer_data: {
        destination: accountId
      }
    });
    console.log(`💰 Charged $${(amount / 100).toFixed(2)} to ${accountId}`);
  } catch (err) {
    console.error(`❌ Error charging ${accountId} $${amount / 100}:`, err.message);
  }
}

(async () => {
  for (const { account, charges } of testData) {
    for (const amount of charges) {
      await createTestPayment(account, amount);
    }
  }
})(); 