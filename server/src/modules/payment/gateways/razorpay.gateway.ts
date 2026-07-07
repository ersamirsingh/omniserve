import { PaymentGateway } from "../payment-gateway.interface.js";

export class RazorpayGateway implements PaymentGateway {
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    return `cust_rp_${Math.random().toString(36).substring(2, 10)}`;
  }

  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const subId = `sub_rp_${Math.random().toString(36).substring(2, 10)}`;
    return {
      paymentSubscriptionId: subId,
      invoiceUrl: `https://razorpay.com/invoices/mock_${subId}`
    };
  }

  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    console.log(`[RazorpayGateway] Cancelled Razorpay subscription: ${paymentSubscriptionId}`);
  }

  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const invId = `inv_rp_${Math.random().toString(36).substring(2, 10)}`;
    return {
      invoiceId: invId,
      invoiceUrl: `https://razorpay.com/invoices/mock_${invId}`
    };
  }

  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    return { event: "subscription.charged", payload: { payment: { entity: { id: "mock_payment" } } } };
  }

  async refund(paymentReference: string, amount: number): Promise<string> {
    return `ref_rp_${Math.random().toString(36).substring(2, 10)}`;
  }
}
