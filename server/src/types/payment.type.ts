export interface ICreatePaymentRequest {
  orderId: string;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  currency?: string;
  status?: string;
  gatewayResponse?: Record<string, any>;
}

export interface IRefundPaymentRequest {
  refundTransactionId: string;
}

export interface IQueryPayments {
  orderId?: string;
  status?: string;
  limit?: string;
  page?: string;
}
