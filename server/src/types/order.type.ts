export interface IOrderItemRequest {
  menuItemId: string;
  variantId?: string;
  addons?: Array<{ addonId: string; name: string; price: number }>;
  quantity: number;
  unitPrice: number;
  name: string;
  notes?: string;
}

export interface IPlaceOrderRequest {
  outletId: string;
  customerId: string;
  source: string;
  subtotal: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  totalAmount: number;
  notes?: string;
  items: IOrderItemRequest[];
}

export interface IUpdateStatusRequest {
  orderStatus: string;
}

export interface ICancelOrderRequest {
  cancellationReason: string;
}

export interface IAddItemRequest {
  menuItemId: string;
  variantId?: string;
  addons?: Array<{ addonId: string; name: string; price: number }>;
  quantity: number;
  unitPrice: number;
  name: string;
  notes?: string;
}

export interface IQueryOrders {
  outletId?: string;
  orderStatus?: string;
  date?: string; // YYYY-MM-DD
  limit?: string;
  page?: string;
}
