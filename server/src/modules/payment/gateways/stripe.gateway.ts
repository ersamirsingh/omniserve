import Stripe from 'stripe';
import { PaymentGateway } from "../payment-gateway.interface.js";

export class StripeGateway implements PaymentGateway {
  private getStripeInstance(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
    }
    return new Stripe(secretKey, {
      apiVersion: '2025-01-27' as any, // use current SDK api version
    });
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const stripe = this.getStripeInstance();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { tenantId }
    });
    return customer.id;
  }

  /**
   * Create a plan product dynamically and start a Stripe subscription
   */
  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const stripe = this.getStripeInstance();

    // 1. Create a Price object dynamically for the recurring subscription fee
    const priceObject = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // convert to cents
      currency: 'inr',
      recurring: { interval: billingCycle === 'MONTHLY' ? 'month' : 'year' },
      product_data: {
        name: planId,
        metadata: { tenantId }
      },
    });

    // 2. Create the subscription session for the customer
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceObject.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { tenantId }
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const invoiceUrl = invoice ? (invoice.hosted_invoice_url || undefined) : undefined;

    return {
      paymentSubscriptionId: subscription.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  /**
   * Cancel an active Stripe subscription immediately
   */
  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    const stripe = this.getStripeInstance();
    await stripe.subscriptions.cancel(paymentSubscriptionId);
  }

  /**
   * Create a one-off invoice in Stripe
   */
  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const stripe = this.getStripeInstance();

    // 1. Create an Invoice Item representing the fee charge line
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount * 100), // convert to cents
      currency: 'inr',
      description,
      metadata: { tenantId }
    });

    // 2. Create the overall Invoice object
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      metadata: { tenantId }
    });

    // 3. Finalize the invoice to generate the public hosted invoice URL
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const invoiceUrl = finalized.hosted_invoice_url || undefined;

    return {
      invoiceId: finalized.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  /**
   * Reconstruct and verify a webhook event using the raw body and signature
   */
  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    const stripe = this.getStripeInstance();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing in environment variables');
    }
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  /**
   * Create a refund charge in Stripe
   */
  async refund(paymentReference: string, amount: number): Promise<string> {
    const stripe = this.getStripeInstance();
    const refundObj = await stripe.refunds.create({
      charge: paymentReference,
      amount: Math.round(amount * 100) // convert to cents
    });
    return refundObj.id;
  }
}
