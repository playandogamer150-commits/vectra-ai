import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { appUsers } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      try {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        await WebhookHandlers.handleEvent(event);
      } catch (err) {
        console.log('Webhook event parsing failed (using sync fallback):', err);
      }
    }
  }

  static async handleEvent(event: Stripe.Event): Promise<void> {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionCreated(
          subscription.id,
          subscription.customer as string,
          subscription.status
        );
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionUpdated(
          subscription.id,
          subscription.customer as string,
          subscription.status
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionCanceled(subscription.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await WebhookHandlers.handlePaymentFailed(invoice.customer as string);
        }
        break;
      }
    }
  }

  static async handleSubscriptionCreated(subscriptionId: string, customerId: string, status: string): Promise<void> {
    const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free';
    
    await db.update(appUsers)
      .set({
        stripeSubscriptionId: subscriptionId,
        plan: plan,
        planStatus: status as any,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeCustomerId, customerId));
  }

  static async handleSubscriptionUpdated(subscriptionId: string, customerId: string, status: string): Promise<void> {
    const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free';
    
    await db.update(appUsers)
      .set({
        plan: plan,
        planStatus: status as any,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeSubscriptionId, subscriptionId));
  }

  static async handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
    await db.update(appUsers)
      .set({
        plan: 'free',
        planStatus: 'canceled',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeSubscriptionId, subscriptionId));
  }

  static async handlePaymentFailed(customerId: string): Promise<void> {
    await db.update(appUsers)
      .set({
        planStatus: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeCustomerId, customerId));
  }
}
