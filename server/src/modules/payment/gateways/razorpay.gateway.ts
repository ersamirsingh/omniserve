import Razorpay from 'razorpay';
import { PaymentGateway } from "../payment-gateway.interface.js";

export class RazorpayGateway implements PaymentGateway {
  private getRazorpayInstance(): any {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in environment variables');
    }
    return new (Razorpay as any)({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Create a customer in Razorpay
   */
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const rzp = this.getRazorpayInstance();
    const customer = await rzp.customers.create({
      email,
      name,
      notes: { tenantId }
    });
    return customer.id;
  }

  /**
   * Create a Plan dynamically and start a subscription in Razorpay
   */
  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const rzp = this.getRazorpayInstance();

    // 1. Create a Plan object dynamically in Razorpay
    const plan = await rzp.plans.create({
      period: billingCycle === "MONTHLY" ? "monthly" : "yearly",
      interval: 1,
      item: {
        name: planId,
        amount: Math.round(price * 100), // convert price to paise
        currency: "INR",
        description: `Subscription fee for ${planId}`
      },
      notes: { tenantId }
    });

    // 2. Create the subscription linked to the customer and plan
    const subscription = await rzp.subscriptions.create({
      plan_id: plan.id,
      customer_id: customerId,
      total_count: billingCycle === "MONTHLY" ? 12 : 1, // bill 12 times for monthly, 1 time for yearly
      quantity: 1,
      notes: { tenantId }
    });

    const invoiceUrl = subscription.short_url || undefined;
    return {
      paymentSubscriptionId: subscription.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  /**
   * Cancel an active Razorpay subscription
   */
  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    const rzp = this.getRazorpayInstance();
    // Second parameter signifies whether to cancel immediately (true) or at end of cycle (false)
    await rzp.subscriptions.cancel(paymentSubscriptionId, false);
  }

  /**
   * Create a one-off invoice with a payment link in Razorpay
   */
  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const rzp = this.getRazorpayInstance();

    const invoice = await rzp.invoices.create({
      customer_id: customerId,
      type: "invoice",
      description,
      line_items: [{
        name: description,
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        quantity: 1
      }],
      notes: { tenantId }
    });

    const invoiceUrl = invoice.short_url || undefined;
    return {
      invoiceId: invoice.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  /**
   * Reconstruct and verify a Razorpay webhook signature
   */
  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is missing in environment variables');
    }
    
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid Razorpay signature');
    }

    return JSON.parse(rawBody);
  }

  /**
   * Issue a refund for a transaction in Razorpay
   */
  async refund(paymentReference: string, amount: number): Promise<string> {
    const rzp = this.getRazorpayInstance();
    const refundObj = await rzp.payments.refund(paymentReference, {
      amount: Math.round(amount * 100), // convert to paise
    });
    return refundObj.id;
  }
}
