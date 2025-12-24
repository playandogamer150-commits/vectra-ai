import { getUncachableStripeClient } from '../server/stripeClient';

async function seedProducts() {
  console.log('Creating Stripe products and prices...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'Vectra AI Pro'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist. Skipping seed.');
    return;
  }

  const proProduct = await stripe.products.create({
    name: 'Vectra AI Pro',
    description: 'Professional plan with unlimited generations, LoRA training, and priority support',
    metadata: {
      plan: 'pro',
      features: 'unlimited_generations,lora_training,priority_support,custom_blueprints',
    },
  });
  console.log(`Created product: ${proProduct.id}`);

  const monthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 1900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro', billing_period: 'monthly' },
  });
  console.log(`Created monthly price: ${monthlyPrice.id}`);

  const monthlyPriceBrl = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900,
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro', billing_period: 'monthly', region: 'brazil' },
  });
  console.log(`Created monthly BRL price: ${monthlyPriceBrl.id}`);

  const yearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 19000,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'pro', billing_period: 'yearly' },
  });
  console.log(`Created yearly price: ${yearlyPrice.id}`);

  console.log('Stripe products seeded successfully!');
  console.log('\nUpdate your pricing page with these price IDs:');
  console.log(`  Monthly USD: ${monthlyPrice.id}`);
  console.log(`  Monthly BRL: ${monthlyPriceBrl.id}`);
  console.log(`  Yearly USD: ${yearlyPrice.id}`);
}

seedProducts().catch(console.error);
