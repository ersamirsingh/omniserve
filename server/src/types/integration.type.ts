import { OrderStatus } from "../models/enums.js";

export enum IntegrationProvider {
  QR = "QR",
  MOCK_SWIGGY = "MOCK_SWIGGY",
  MOCK_ZOMATO = "MOCK_ZOMATO",
  SWIGGY = "SWIGGY",
  ZOMATO = "ZOMATO",
  ONDC = "ONDC",
  MAGICPIN = "MAGICPIN",
  WEBSITE = "WEBSITE",
  WHATSAPP = "WHATSAPP",
  PORTER = "PORTER",
  DUNZO = "DUNZO",
  CUSTOM = "CUSTOM",
}

export enum IntegrationConnectionStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export enum IntegrationProcessingStatus {
  RECEIVED = "RECEIVED",
  NORMALIZING = "NORMALIZING",
  NORMALIZED = "NORMALIZED",
  PLACED = "PLACED",
  MAPPING_REVIEW_REQUIRED = "MAPPING_REVIEW_REQUIRED",
  FAILED_VALIDATION = "FAILED_VALIDATION",
  RETRY_PENDING = "RETRY_PENDING",
  DLQ = "DLQ",
  CANCELLED = "CANCELLED",
}

export enum IntegrationEventDirection {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  INTERNAL = "INTERNAL",
}

export enum IntegrationEventStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  RETRY_PENDING = "RETRY_PENDING",
  DLQ = "DLQ",
  SKIPPED = "SKIPPED",
}

export enum SyncJobType {
  MENU_PUBLISH = "MENU_PUBLISH",
  INVENTORY_UPDATE = "INVENTORY_UPDATE",
  STATUS_UPDATE = "STATUS_UPDATE",
  ORDER_ACK = "ORDER_ACK",
  ORDER_CANCEL = "ORDER_CANCEL",
  MENU_SYNC = "MENU_SYNC",
  INVENTORY_SYNC = "INVENTORY_SYNC",
  ORDER_STATUS_SYNC = "ORDER_STATUS_SYNC",
}

export enum SyncJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  RETRY_PENDING = "RETRY_PENDING",
  DLQ = "DLQ",
  CANCELLED = "CANCELLED",
}

export type CanonicalOrderSource =
  | "QR_DINE_IN"
  | "WEBSITE"
  | "POS"
  | "WAITER"
  | "MOCK_SWIGGY"
  | "MOCK_ZOMATO"
  | "SWIGGY"
  | "ZOMATO"
  | "ONDC"
  | "MAGICPIN"
  | "CUSTOM";

export type CanonicalFulfillmentType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export type CanonicalPaymentMode =
  | "ONLINE"
  | "COD"
  | "CASH"
  | "CARD"
  | "UPI"
  | "WALLET";

export type CanonicalPaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED";

export interface CanonicalAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface CanonicalCustomer {
  externalCustomerId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: CanonicalAddress;
}

export interface CanonicalFulfillment {
  type: CanonicalFulfillmentType;
  tableId?: string;
  tableNumber?: string;
  seatNumber?: string;
  expectedPickupAt?: string;
  deliveryPartner?: string;
  addressId?: string;
  scheduledFor?: Date;
  instructions?: string;
}

export interface CanonicalPayment {
  mode: CanonicalPaymentMode;
  status: CanonicalPaymentStatus;
  transactionId?: string;
}

export interface CanonicalPricing {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  packagingFee?: number;
  platformFee?: number;
  totalAmount: number;
}

export interface CanonicalOrderAddon {
  externalAddonId?: string;
  addonId?: string;
  name: string;
  price: number;
}

export interface CanonicalOrderItem {
  externalItemId?: string;
  externalVariantId?: string;
  menuItemId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  addons?: CanonicalOrderAddon[];
}

export interface CanonicalOrder {
  source: CanonicalOrderSource;
  provider: IntegrationProvider | string;
  externalOrderId: string;
  externalDisplayId?: string;
  tenantId: string;
  outletId: string;
  customer: CanonicalCustomer;
  fulfillment: CanonicalFulfillment;
  payment: CanonicalPayment;
  pricing: CanonicalPricing;
  items: CanonicalOrderItem[];
  notes?: string;
  couponCode?: string;
  rawPayloadRef?: string;
}

export interface AdapterNormalizeOrderArgs {
  payload: unknown;
  tenantId: string;
  connectionId?: string | undefined;
  provider: IntegrationProvider | string;
}

export interface AdapterVerifySignatureArgs {
  rawBody: string;
  headers: Record<string, unknown>;
  secret?: string | undefined;
}

export interface AdapterBuildMenuPayloadArgs {
  outletId: string;
  menuItems: unknown[];
  categories: unknown[];
  variants: unknown[];
  addons: unknown[];
}

export interface AdapterBuildInventoryPayloadArgs {
  outletId: string;
  changedItems: unknown[];
}

export interface IntegrationAdapter {
  provider: IntegrationProvider | string;
  verifySignature(args: AdapterVerifySignatureArgs): Promise<boolean>;
  normalizeOrder(args: AdapterNormalizeOrderArgs): Promise<CanonicalOrder>;
  mapStatusToInternal(providerStatus: string): OrderStatus | null;
  mapStatusToProvider(internalStatus: OrderStatus): string;
  buildMenuPayload(args: AdapterBuildMenuPayloadArgs): Promise<unknown>;
  buildInventoryPayload(args: AdapterBuildInventoryPayloadArgs): Promise<unknown>;
}


