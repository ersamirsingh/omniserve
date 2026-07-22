import Stripe from 'stripe';
import { PaymentGateway } from "../payment-gateway.interface.js";

export class StripeGateway implements PaymentGateway {
  private getStripeInstance(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
    }
    return new Stripe(secretKey, {
      apiVersion: '2025-01-27' as any,
    });
  }

  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const stripe = this.getStripeInstance();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { tenantId }
    });
    return customer.id;
  }

  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const stripe = this.getStripeInstance();

    const priceObject = await stripe.prices.create({
      unit_amount: Math.round(price * 100),
      currency: 'inr',
      recurring: { interval: billingCycle === 'MONTHLY' ? 'month' : 'year' },
      product_data: {
        name: planId,
        metadata: { tenantId }
      },
    });

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

  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    const stripe = this.getStripeInstance();
    await stripe.subscriptions.cancel(paymentSubscriptionId);
  }

  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const stripe = this.getStripeInstance();

    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount * 100),
      currency: 'inr',
      description,
      metadata: { tenantId }
    });

    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      metadata: { tenantId }
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const invoiceUrl = finalized.hosted_invoice_url || undefined;

    return {
      invoiceId: finalized.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    const stripe = this.getStripeInstance();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing in environment variables');
    }
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async refund(paymentReference: string, amount: number): Promise<string> {
    const stripe = this.getStripeInstance();
    const refundObj = await stripe.refunds.create({
      charge: paymentReference,
      amount: Math.round(amount * 100)
    });
    return refundObj.id;
  }
}
