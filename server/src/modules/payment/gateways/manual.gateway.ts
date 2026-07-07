import { PaymentGateway } from "../payment-gateway.interface.js";

export class ManualGateway implements PaymentGateway {
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    return `cust_manual_${tenantId}`;
  }

  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }> {
    const subId = `sub_manual_${Math.random().toString(36).substring(2, 10)}`;
    return {
      paymentSubscriptionId: subId,
      invoiceUrl: ""
    };
  }

  async cancelSubscription(paymentSubscriptionId: string): Promise<void> {
    console.log(`[ManualGateway] Cancelled manual subscription: ${paymentSubscriptionId}`);
  }

  async createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const invId = `inv_manual_${Math.random().toString(36).substring(2, 10)}`;
    return {
      invoiceId: invId,
      invoiceUrl: ""
    };
  }

  async verifyWebhook(signature: string, rawBody: string): Promise<any> {
    return { type: "manual.activated" };
  }

  async refund(paymentReference: string, amount: number): Promise<string> {
    return `ref_manual_${Math.random().toString(36).substring(2, 10)}`;
  }
}
