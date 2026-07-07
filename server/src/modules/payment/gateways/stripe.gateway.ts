import { PaymentGateway } from "../payment-gateway.interface.js";

export class StripeGateway implements PaymentGateway {
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    return `cus_stripe_${Math.random().toString(36).substring(2, 10)}`;
  }

  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const subId = `sub_stripe_${Math.random().toString(36).substring(2, 10)}`;
    return {
      paymentSubscriptionId: subId,
      invoiceUrl: `https://stripe.com/invoices/mock_${subId}`
    };
  }

  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    console.log(`[StripeGateway] Cancelled Stripe subscription: ${paymentSubscriptionId}`);
  }

  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const invId = `in_stripe_${Math.random().toString(36).substring(2, 10)}`;
    return {
      invoiceId: invId,
      invoiceUrl: `https://stripe.com/invoices/mock_${invId}`
    };
  }

  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    return { type: "charge.succeeded", data: { object: { customer: "mock_customer" } } };
  }

  async refund(paymentReference: string, amount: number): Promise<string> {
    return `ref_stripe_${Math.random().toString(36).substring(2, 10)}`;
  }
}
