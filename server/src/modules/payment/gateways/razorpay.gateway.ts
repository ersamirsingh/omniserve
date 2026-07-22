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

  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const rzp = this.getRazorpayInstance();
    const customer = await rzp.customers.create({
      email,
      name,
      notes: { tenantId }
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
    const rzp = this.getRazorpayInstance();

    const plan = await rzp.plans.create({
      period: billingCycle === "MONTHLY" ? "monthly" : "yearly",
      interval: 1,
      item: {
        name: planId,
        amount: Math.round(price * 100),
        currency: "INR",
        description: `Subscription fee for ${planId}`
      },
      notes: { tenantId }
    });

    const subscription = await rzp.subscriptions.create({
      plan_id: plan.id,
      customer_id: customerId,
      total_count: billingCycle === "MONTHLY" ? 12 : 1,
      quantity: 1,
      notes: { tenantId }
    });

    const invoiceUrl = subscription.short_url || undefined;
    return {
      paymentSubscriptionId: subscription.id,
      ...(invoiceUrl && { invoiceUrl })
    };
  }

  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    const rzp = this.getRazorpayInstance();

    await rzp.subscriptions.cancel(paymentSubscriptionId, false);
  }

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
        amount: Math.round(amount * 100),
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

  async refund(paymentReference: string, amount: number): Promise<string> {
    const rzp = this.getRazorpayInstance();
    const refundObj = await rzp.payments.refund(paymentReference, {
      amount: Math.round(amount * 100),
    });
    return refundObj.id;
  }
}
