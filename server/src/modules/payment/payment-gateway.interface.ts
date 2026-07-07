export interface PaymentGateway {
  createCustomer(tenantId: string, email: string, name: string): Promise<string>;
  createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    price: number,
    billingCycle: "MONTHLY" | "YEARLY"
  ): Promise<{ paymentSubscriptionId: string; invoiceUrl?: string }>;
  cancelSubscription(paymentSubscriptionId: string): Promise<void>;
  createInvoice(
    tenantId: string,
    customerId: string,
    amount: number,
    description: string
  ): Promise<{ invoiceId: string; invoiceUrl?: string }>;
  verifyWebhook(signature: string, rawBody: string): Promise<any>;
  refund(paymentReference: string, amount: number): Promise<string>;
}
