import { db } from './db';
import { appUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getUncachableStripeClient } from './stripeClient';
import { log } from './lib/logger';

// Interface for product with price
export interface StripeProductWithPrice {
  productId: string;
  productName: string;
  description: string | null;
  priceId: string;
  amount: number; // in cents
  currency: string;
  interval: 'month' | 'year' | 'week' | 'day' | null;
  intervalCount: number | null;
  active: boolean;
  metadata: Record<string, string>;
}

export class StripeService {
  async createCustomer(email: string, userId: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) throw new Error("Stripe disabled");
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, locale?: string, userId?: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) throw new Error("Stripe disabled");
    const checkoutLocale = locale?.startsWith('en') ? 'en' : 'pt-BR';
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: checkoutLocale,
      subscription_data: userId ? {
        metadata: { userId, customerId },
      } : undefined,
      metadata: userId ? { userId, customerId } : undefined,
    });
  }

  /**
   * PIX pre-paid (30 days) - one-time payment.
   * This keeps the monthly subscription via card intact, while offering a PIX option.
   */
  async createPix30dCheckoutSession(
    customerId: string,
    successUrl: string,
    cancelUrl: string,
    locale?: string,
    userId?: string,
  ) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) throw new Error("Stripe disabled");
    const checkoutLocale = locale?.startsWith('en') ? 'en' : 'pt-BR';

    // R$ 59,90 in cents (BRL has 2 decimals in Stripe)
    const unitAmount = 5990;

    return await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["pix"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: unitAmount,
            product_data: {
              name: "Vectra AI Pro (Pix • 30 dias)",
              description: "Acesso Pro por 30 dias (pré-pago via Pix).",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: checkoutLocale,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 min
      metadata: userId ? { userId, customerId, purchaseType: "pix_30d" } : { customerId, purchaseType: "pix_30d" },
      payment_intent_data: userId ? { metadata: { userId, customerId, purchaseType: "pix_30d" } } : { metadata: { customerId, purchaseType: "pix_30d" } },
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) throw new Error("Stripe disabled");
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * List products with prices directly from Stripe API
   * This is the preferred method - no SQL needed
   */
  async listProductsWithPrices(): Promise<StripeProductWithPrice[]> {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      log('Stripe client not available', 'stripe', 'warn');
      return [];
    }

    try {
      // Fetch active products
      const products = await stripe.products.list({
        active: true,
        limit: 20,
      });

      // Fetch active prices
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
        expand: ['data.product'],
      });

      // Map products with their prices
      const result: StripeProductWithPrice[] = [];

      for (const price of prices.data) {
        if (!price.product || typeof price.product === 'string') continue;

        // Skip deleted products
        const product = price.product;
        if ('deleted' in product && product.deleted) continue;
        if (!('active' in product) || !product.active) continue;

        result.push({
          productId: product.id,
          productName: product.name,
          description: product.description,
          priceId: price.id,
          amount: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval || null,
          intervalCount: price.recurring?.interval_count || null,
          active: price.active,
          metadata: { ...product.metadata, ...price.metadata },
        });
      }

      // Sort by amount (lowest first)
      result.sort((a, b) => a.amount - b.amount);

      log(`Fetched ${result.length} products with prices from Stripe API`, 'stripe');
      return result;
    } catch (error: any) {
      log(`Error fetching products from Stripe: ${error.message}`, 'stripe', 'error');
      throw error;
    }
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) throw new Error("Stripe disabled");

    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      log(`Error fetching subscription ${subscriptionId}: ${error.message}`, 'stripe', 'error');
      return null;
    }
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    plan?: 'free' | 'pro';
    planStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  }) {
    const [user] = await db.update(appUsers)
      .set({ ...stripeInfo, updatedAt: new Date() })
      .where(eq(appUsers.id, userId))
      .returning();
    return user;
  }
}

export const stripeService = new StripeService();
