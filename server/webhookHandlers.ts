import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { appUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { log } from './lib/logger';

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

    if (webhookSecret && stripe) {
      try {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        await WebhookHandlers.handleEvent(event);
      } catch (err) {
        log(`Webhook event parsing failed: ${err}`, 'stripe', 'warn');
      }
    }
  }

  static async handleEvent(event: Stripe.Event): Promise<void> {
    log(`[Stripe Webhook] Processing event: ${event.type}`, 'stripe', 'info');

    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionCreated(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionUpdated(subscription);
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        log(`Checkout completed for customer ${session.customer}`, 'stripe', 'info');
        break;
      }
      default:
        log(`Unhandled webhook event type: ${event.type}`, 'stripe', 'debug');
    }
  }

  static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const userId = subscription.metadata?.userId;

    log(`Subscription created: ${subscriptionId} for customer ${customerId} (status: ${status})`, 'stripe', 'info');

    const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free';

    // Try to update by userId first (from metadata), fallback to customerId
    let updated = false;

    if (userId) {
      const result = await db.update(appUsers)
        .set({
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          plan: plan,
          planStatus: status as any,
          updatedAt: new Date(),
        })
        .where(eq(appUsers.id, userId))
        .returning();

      if (result.length > 0) {
        updated = true;
        log(`Updated user ${userId} to plan: ${plan}`, 'stripe', 'info');
      }
    }

    // Fallback: update by customerId
    if (!updated) {
      const result = await db.update(appUsers)
        .set({
          stripeSubscriptionId: subscriptionId,
          plan: plan,
          planStatus: status as any,
          updatedAt: new Date(),
        })
        .where(eq(appUsers.stripeCustomerId, customerId))
        .returning();

      if (result.length > 0) {
        log(`Updated user by customerId ${customerId} to plan: ${plan}`, 'stripe', 'info');
      } else {
        log(`No user found for customerId ${customerId}`, 'stripe', 'warn');
      }
    }
  }

  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const subscriptionId = subscription.id;
    const status = subscription.status;

    log(`Subscription updated: ${subscriptionId} (status: ${status})`, 'stripe', 'info');

    const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free';

    const result = await db.update(appUsers)
      .set({
        plan: plan,
        planStatus: status as any,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeSubscriptionId, subscriptionId))
      .returning();

    if (result.length > 0) {
      log(`Updated subscription ${subscriptionId} to plan: ${plan}`, 'stripe', 'info');
    } else {
      log(`No user found for subscription ${subscriptionId}`, 'stripe', 'warn');
    }
  }

  static async handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
    log(`Subscription canceled: ${subscriptionId}`, 'stripe', 'info');

    const result = await db.update(appUsers)
      .set({
        plan: 'free',
        planStatus: 'canceled',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeSubscriptionId, subscriptionId))
      .returning();

    if (result.length > 0) {
      log(`Canceled subscription ${subscriptionId}, user reverted to free plan`, 'stripe', 'info');
    } else {
      log(`No user found for subscription ${subscriptionId} during cancellation`, 'stripe', 'warn');
    }
  }

  static async handlePaymentFailed(customerId: string): Promise<void> {
    log(`Payment failed for customer: ${customerId}`, 'stripe', 'warn');

    await db.update(appUsers)
      .set({
        planStatus: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(appUsers.stripeCustomerId, customerId));
  }
}
