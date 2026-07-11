import { Types } from "mongoose";
import { AuditAction, OrderSource, PaymentMethod, PaymentStatus } from "../../models/enums.js";
import ChannelAddonMapping from "../../models/channeladdonmapping.model.js";
import ChannelMenuItemMapping from "../../models/channelmenuitemmapping.model.js";
import ChannelVariantMapping from "../../models/channelvariantmapping.model.js";
import ExternalOrder, { IExternalOrder } from "../../models/externalorder.model.js";
import IntegrationEvent from "../../models/integrationevent.model.js";
import QRSession from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import {
  CanonicalOrder,
  CanonicalOrderAddon,
  CanonicalOrderItem,
  IntegrationAdapter,
  IntegrationEventDirection,
  IntegrationEventStatus,
  IntegrationProcessingStatus,
  IntegrationProvider,
} from "../../types/integration.type.js";
import { AuditLogService } from "../auditLog/auditLog.service.js";
import { CustomerService } from "../customer/customer.service.js";
import { OrderService } from "./order.service.js";
import { CustomerResolutionService } from "../customer/customer-resolution.service.js";
import { MappingResolutionService } from "../integration/mapping-resolution.service.js";
import { PaymentService } from "../payment/payment.service.js";

interface IngestExternalOrderInput {
  tenantId: string;
  provider: IntegrationProvider;
  externalOrderId: string;
  rawPayload: unknown;
  externalDisplayId?: string | undefined;
  outletId?: string | undefined;
  connectionId?: string | undefined;
  maxRetryCount?: number | undefined;
  actorUserId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

interface ProcessExternalOrderInput {
  externalOrderId: string;
  tenantId: string;
  actorUserId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

interface GatewayResult {
  externalOrder: IExternalOrder;
  idempotent: boolean;
}

interface InternalOrderPayload {
  outletId: string;
  customerId: string;
  source: OrderSource;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  notes?: string;
  couponCode?: string | undefined;
  diningContext?: {
    tableId?: string;
    tableNumber?: string;
    seatNumber?: string;
    sessionId?: string;
  };
  items: Array<{
    menuItemId: string;
    variantId?: string;
    addons?: Array<{
      addonId: string;
      name: string;
      price: number;
    }>;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

export class OrderGatewayService {
  private static adapters = new Map<string, IntegrationAdapter>();

  static registerAdapter(adapter: IntegrationAdapter): void {
    this.adapters.set(String(adapter.provider).toUpperCase(), adapter);
  }

  static getAdapter(provider: IntegrationProvider | string): IntegrationAdapter {
    const adapter = this.adapters.get(String(provider).toUpperCase());
    if (!adapter) {
      throw new Error(`No integration adapter registered for provider ${provider}`);
    }
    return adapter;
  }

  static getRegisteredProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  static async ingestExternalOrder(input: IngestExternalOrderInput): Promise<GatewayResult> {
    this.assertObjectId(input.tenantId, "tenantId");
    if (input.outletId) this.assertObjectId(input.outletId, "outletId");
    if (input.connectionId) this.assertObjectId(input.connectionId, "connectionId");
    if (input.actorUserId) this.assertObjectId(input.actorUserId, "actorUserId");

    const existing = await ExternalOrder.findOne({
      tenantId: new Types.ObjectId(input.tenantId),
      provider: input.provider,
      externalOrderId: input.externalOrderId,
      isDeleted: false,
    });

    if (existing) {
      await this.recordIntegrationEvent({
        tenantId: input.tenantId,
        outletId: existing.outletId?.toString(),
        connectionId: existing.connectionId?.toString(),
        provider: input.provider,
        eventType: "ORDER_INGEST_IDEMPOTENT_HIT",
        externalOrderId: input.externalOrderId,
        externalOrderRef: existing._id as Types.ObjectId,
        payload: input.rawPayload,
        status: IntegrationEventStatus.SKIPPED,
        actorUserId: input.actorUserId,
      });

      return { externalOrder: existing, idempotent: true };
    }

    const externalOrder = await ExternalOrder.create({
      tenantId: new Types.ObjectId(input.tenantId),
      outletId: input.outletId ? new Types.ObjectId(input.outletId) : null,
      connectionId: input.connectionId ? new Types.ObjectId(input.connectionId) : null,
      provider: input.provider,
      externalOrderId: input.externalOrderId,
      externalDisplayId: input.externalDisplayId || null,
      rawPayload: input.rawPayload,
      status: IntegrationProcessingStatus.RECEIVED,
      maxRetryCount: input.maxRetryCount ?? 3,
      createdBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
      updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
    });

    await this.recordIntegrationEvent({
      tenantId: input.tenantId,
      outletId: input.outletId,
      connectionId: input.connectionId,
      provider: input.provider,
      eventType: "ORDER_INGESTED",
      externalOrderId: input.externalOrderId,
      externalOrderRef: externalOrder._id as Types.ObjectId,
      payload: input.rawPayload,
      status: IntegrationEventStatus.SUCCESS,
      actorUserId: input.actorUserId,
    });

    await this.recordAuditLog(input.tenantId, input.actorUserId, {
      entityId: (externalOrder._id as Types.ObjectId).toString(),
      entityType: "ExternalOrder",
      action: AuditAction.CREATE,
      newData: {
        provider: input.provider,
        externalOrderId: input.externalOrderId,
        status: IntegrationProcessingStatus.RECEIVED,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { externalOrder, idempotent: false };
  }

  static async processExternalOrder(input: ProcessExternalOrderInput): Promise<IExternalOrder> {
    this.assertObjectId(input.externalOrderId, "externalOrderId");
    this.assertObjectId(input.tenantId, "tenantId");
    if (input.actorUserId) this.assertObjectId(input.actorUserId, "actorUserId");

    const externalOrder = await ExternalOrder.findOne({
      _id: new Types.ObjectId(input.externalOrderId),
      tenantId: new Types.ObjectId(input.tenantId),
      isDeleted: false,
    });

    if (!externalOrder) {
      throw new Error("External order not found or does not belong to this tenant");
    }

    if (externalOrder.status === IntegrationProcessingStatus.PLACED) {
      return externalOrder;
    }

    await ExternalOrder.updateOne(
      { _id: externalOrder._id, tenantId: externalOrder.tenantId },
      {
        status: IntegrationProcessingStatus.NORMALIZING,
        failureReason: null,
        updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
      }
    );

    try {
      const rawPay = externalOrder.rawPayload as any;
      if (rawPay && rawPay._chaosMode) {
        if (rawPay._chaosMode === "VALIDATION_ERROR") {
          throw new Error("ValidationError: Chaos mode active - invalid payload fields");
        } else if (rawPay._chaosMode === "MAPPING_ERROR") {
          throw new Error("MAPPING_ERROR: Chaos mode active - menu item mapping missing");
        } else if (rawPay._chaosMode === "DLQ_ERROR") {
          throw new Error("DLQ_ERROR: Chaos mode active - critical connection failure");
        }
      }

      const adapter = this.getAdapter(externalOrder.provider);
      const canonicalOrder = await adapter.normalizeOrder({
        payload: externalOrder.rawPayload,
        tenantId: externalOrder.tenantId.toString(),
        connectionId: externalOrder.connectionId?.toString(),
        provider: externalOrder.provider,
      });

      if (canonicalOrder.tenantId !== externalOrder.tenantId.toString()) {
        throw new Error("Canonical order tenant does not match external order tenant");
      }

      // Resolve the internal outletId from the external outletId
      const internalOutletId = await MappingResolutionService.resolveOutletId(
        canonicalOrder.tenantId,
        canonicalOrder.provider,
        canonicalOrder.outletId
      );

      canonicalOrder.outletId = internalOutletId;

      const internalPayload = await this.toInternalOrderPayload(canonicalOrder);

      await ExternalOrder.updateOne(
        { _id: externalOrder._id, tenantId: externalOrder.tenantId },
        {
          outletId: new Types.ObjectId(internalOutletId),
          canonicalPayload: canonicalOrder,
          status: IntegrationProcessingStatus.NORMALIZED,
          updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
        }
      );

      const order = await OrderService.placeOrder(
        externalOrder.tenantId.toString(),
        internalPayload,
        input.actorUserId
      );

      // Record successful payment transaction if prepaid/online payment succeeded
      if (canonicalOrder.payment && canonicalOrder.payment.status === "SUCCESS") {
        try {
          const paymentMethod = canonicalOrder.payment.mode === "CASH" ? PaymentMethod.CASH : PaymentMethod.UPI;
          const transactionId = canonicalOrder.payment.transactionId || `TXN-${canonicalOrder.provider}-${canonicalOrder.externalOrderId}`;
          
          await PaymentService.createPayment(
            externalOrder.tenantId.toString(),
            {
              orderId: order._id.toString(),
              transactionId,
              paymentMethod,
              amount: canonicalOrder.pricing.totalAmount,
              currency: "INR",
              status: PaymentStatus.SUCCESS,
              gatewayResponse: { provider: canonicalOrder.provider, externalOrderId: canonicalOrder.externalOrderId }
            },
            input.actorUserId ? input.actorUserId.toString() : undefined
          );
        } catch (payError: any) {
          console.error("Failed to automatically record integrated order payment:", payError);
        }
      }

      const placedOrder = await ExternalOrder.findOneAndUpdate(
        { _id: externalOrder._id, tenantId: externalOrder.tenantId },
        {
          internalOrderId: order._id,
          status: IntegrationProcessingStatus.PLACED,
          processedAt: new Date(),
          failureReason: null,
          updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
        },
        { new: true }
      );

      if (!placedOrder) {
        throw new Error("External order disappeared after order placement");
      }

      await this.recordIntegrationEvent({
        tenantId: input.tenantId,
        outletId: internalPayload.outletId,
        connectionId: externalOrder.connectionId?.toString(),
        provider: externalOrder.provider,
        eventType: "ORDER_PLACED_INTERNAL",
        externalOrderId: externalOrder.externalOrderId,
        externalOrderRef: externalOrder._id as Types.ObjectId,
        payload: {
          internalOrderId: (order._id as Types.ObjectId).toString(),
          orderNumber: order.orderNumber,
        },
        status: IntegrationEventStatus.SUCCESS,
        actorUserId: input.actorUserId,
      });

      await this.recordAuditLog(input.tenantId, input.actorUserId, {
        entityId: (placedOrder._id as Types.ObjectId).toString(),
        entityType: "ExternalOrder",
        action: AuditAction.STATUS_CHANGE,
        newData: {
          internalOrderId: (order._id as Types.ObjectId).toString(),
          status: IntegrationProcessingStatus.PLACED,
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      return placedOrder;
    } catch (error: any) {
      console.error("Error processing external order:", error);
      const errorMessage = error.message || "";

      if (errorMessage.includes("MAPPING_ERROR")) {
        return await this.markExternalOrderMappingReviewRequired(
          externalOrder,
          errorMessage,
          input.actorUserId
        );
      }

      if (errorMessage.includes("ValidationError") || errorMessage.includes("validation")) {
        return await this.markExternalOrderValidationFailure(
          externalOrder,
          errorMessage,
          input.actorUserId
        );
      }

      return await this.markExternalOrderFailure(
        externalOrder,
        errorMessage || "External order processing failed",
        input.actorUserId
      );
    }
  }

  static async replayExternalOrder(
    externalOrderId: string,
    tenantId: string,
    actorUserId?: string
  ): Promise<IExternalOrder> {
    this.assertObjectId(externalOrderId, "externalOrderId");
    this.assertObjectId(tenantId, "tenantId");

    const externalOrder = await ExternalOrder.findOne({
      _id: new Types.ObjectId(externalOrderId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!externalOrder) {
      throw new Error("External order not found or does not belong to this tenant");
    }

    if (
      externalOrder.status !== IntegrationProcessingStatus.MAPPING_REVIEW_REQUIRED &&
      externalOrder.status !== IntegrationProcessingStatus.FAILED_VALIDATION &&
      externalOrder.status !== IntegrationProcessingStatus.RETRY_PENDING &&
      externalOrder.status !== IntegrationProcessingStatus.DLQ
    ) {
      throw new Error(`External order in status ${externalOrder.status} cannot be replayed`);
    }

    // Reset external order to RECEIVED status
    await ExternalOrder.updateOne(
      { _id: externalOrder._id, tenantId: externalOrder.tenantId },
      {
        status: IntegrationProcessingStatus.RECEIVED,
        failureReason: null,
        retryCount: 0,
        nextRetryAt: null,
        updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
      }
    );

    await this.recordIntegrationEvent({
      tenantId,
      outletId: externalOrder.outletId?.toString(),
      connectionId: externalOrder.connectionId?.toString(),
      provider: externalOrder.provider,
      eventType: "ORDER_REPLAY_TRIGGERED",
      externalOrderId: externalOrder.externalOrderId,
      externalOrderRef: externalOrder._id as Types.ObjectId,
      payload: { previousStatus: externalOrder.status },
      status: IntegrationEventStatus.SUCCESS,
      actorUserId,
    });

    // Reprocess
    return await this.processExternalOrder({
      externalOrderId: externalOrder._id.toString(),
      tenantId,
      actorUserId,
    });
  }

  private static async toInternalOrderPayload(
    canonicalOrder: CanonicalOrder
  ): Promise<InternalOrderPayload> {
    const customerId = await CustomerResolutionService.resolveCustomer({
      tenantId: canonicalOrder.tenantId,
      phone: canonicalOrder.customer.phone || `ext-${canonicalOrder.provider}-${canonicalOrder.externalOrderId}`,
      name: canonicalOrder.customer.name,
      email: canonicalOrder.customer.email,
      address: canonicalOrder.customer.address ? {
        line1: canonicalOrder.customer.address.line1,
        city: canonicalOrder.customer.address.city,
        state: canonicalOrder.customer.address.state,
        pincode: canonicalOrder.customer.address.pincode
      } : undefined
    });

    const items = await Promise.all(
      canonicalOrder.items.map(item =>
        this.resolveInternalItem(canonicalOrder, item)
      )
    );

    const notes = [
      canonicalOrder.notes,
      canonicalOrder.externalOrderId
        ? `External order: ${canonicalOrder.provider}/${canonicalOrder.externalOrderId}`
        : undefined,
      canonicalOrder.fulfillment.tableNumber
        ? `Table: ${canonicalOrder.fulfillment.tableNumber}`
        : undefined,
      canonicalOrder.fulfillment.seatNumber
        ? `Seat: ${canonicalOrder.fulfillment.seatNumber}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" | ")
      .substring(0, 500);

    let sessionId: string | undefined = undefined;
    if (canonicalOrder.fulfillment.tableId && Types.ObjectId.isValid(canonicalOrder.fulfillment.tableId)) {
      const table = await Table.findOne({ _id: new Types.ObjectId(canonicalOrder.fulfillment.tableId), isDeleted: false });
      if (table && table.activeSessionId) {
        const activeSession = await QRSession.findById(table.activeSessionId);
        if (activeSession && activeSession.status !== "CLOSED" && activeSession.status !== "EXPIRED") {
          sessionId = activeSession._id.toString();
        }
      }
    }

    const payload: InternalOrderPayload = {
      outletId: canonicalOrder.outletId,
      customerId,
      source: this.mapCanonicalSourceToInternal(canonicalOrder),
      subtotal: canonicalOrder.pricing.subtotal,
      tax: canonicalOrder.pricing.tax,
      deliveryFee: canonicalOrder.pricing.deliveryFee,
      discount: canonicalOrder.pricing.discount,
      totalAmount: canonicalOrder.pricing.totalAmount,
      couponCode: canonicalOrder.couponCode || undefined,
      items,
    };

    if (canonicalOrder.fulfillment.tableId || canonicalOrder.fulfillment.tableNumber || canonicalOrder.fulfillment.seatNumber) {
      payload.diningContext = {
        ...(canonicalOrder.fulfillment.tableId && { tableId: canonicalOrder.fulfillment.tableId }),
        ...(canonicalOrder.fulfillment.tableNumber && { tableNumber: canonicalOrder.fulfillment.tableNumber }),
        ...(canonicalOrder.fulfillment.seatNumber && { seatNumber: canonicalOrder.fulfillment.seatNumber }),
        ...(sessionId && { sessionId }),
      };
    }

    if (notes) {
      payload.notes = notes;
    }

    return payload;
  }

  private static async resolveInternalItem(
    canonicalOrder: CanonicalOrder,
    item: CanonicalOrderItem
  ) {
    const menuItemId = item.menuItemId || await this.resolveMenuItemId(canonicalOrder, item);
    const variantId = item.variantId || await this.resolveVariantId(canonicalOrder, item);
    const addons = await Promise.all(
      (item.addons || []).map(addon =>
        this.resolveInternalAddon(canonicalOrder, item, addon)
      )
    );

    const resolvedItem: InternalOrderPayload["items"][number] = {
      menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };

    if (variantId) resolvedItem.variantId = variantId;
    if (addons.length > 0) resolvedItem.addons = addons;
    if (item.notes) resolvedItem.notes = item.notes;

    return resolvedItem;
  }

  private static async resolveMenuItemId(
    canonicalOrder: CanonicalOrder,
    item: CanonicalOrderItem
  ): Promise<string> {
    if (!item.externalItemId) {
      throw new Error(`MAPPING_ERROR: Missing menuItemId or externalItemId for item ${item.name}`);
    }

    return await MappingResolutionService.resolveMenuItemId(
      canonicalOrder.tenantId,
      canonicalOrder.outletId,
      String(canonicalOrder.provider),
      item.externalItemId
    );
  }

  private static async resolveVariantId(
    canonicalOrder: CanonicalOrder,
    item: CanonicalOrderItem
  ): Promise<string | undefined> {
    if (!item.externalVariantId) {
      return undefined;
    }

    return await MappingResolutionService.resolveVariantId(
      canonicalOrder.tenantId,
      canonicalOrder.outletId,
      String(canonicalOrder.provider),
      item.externalVariantId
    );
  }

  private static async resolveInternalAddon(
    canonicalOrder: CanonicalOrder,
    item: CanonicalOrderItem,
    addon: CanonicalOrderAddon
  ): Promise<{ addonId: string; name: string; price: number }> {
    if (addon.addonId) {
      return {
        addonId: addon.addonId,
        name: addon.name,
        price: addon.price,
      };
    }

    if (!addon.externalAddonId) {
      throw new Error(`MAPPING_ERROR: Missing addonId or externalAddonId for addon ${addon.name}`);
    }

    const addonId = await MappingResolutionService.resolveAddonId(
      canonicalOrder.tenantId,
      canonicalOrder.outletId,
      String(canonicalOrder.provider),
      addon.externalAddonId
    );

    return {
      addonId,
      name: addon.name,
      price: addon.price,
    };
  }

  /**
   * TECHNICAL DEBT NOTE:
   * Order.source currently carries both provider-origin values (e.g. SWIGGY, ZOMATO, WEBSITE)
   * and fallback fulfillment-derived values (e.g. DINE_IN, TAKEAWAY, DELIVERY).
   * Persisted orders do not separate provider channel vs fulfillment type natively.
   */
  private static mapCanonicalSourceToInternal(canonicalOrder: CanonicalOrder): OrderSource {
    const provStr = String(canonicalOrder.provider || "").toUpperCase();
    if (provStr === "QR" || provStr === "QR_DINE_IN") return OrderSource.QR_DINE_IN;
    if (provStr === "SWIGGY" || provStr === "MOCK_SWIGGY") return OrderSource.SWIGGY;
    if (provStr === "ZOMATO" || provStr === "MOCK_ZOMATO") return OrderSource.ZOMATO;
    if (provStr === "POS") return OrderSource.POS;
    if (provStr === "WEBSITE") return OrderSource.WEBSITE;

    if (canonicalOrder.fulfillment.type === "DINE_IN") return OrderSource.DINE_IN;
    if (canonicalOrder.fulfillment.type === "TAKEAWAY") return OrderSource.TAKEAWAY;
    if (canonicalOrder.fulfillment.type === "DELIVERY") return OrderSource.DELIVERY;
    return OrderSource.ONLINE;
  }

  private static async markExternalOrderMappingReviewRequired(
    externalOrder: IExternalOrder,
    failureReason: string,
    actorUserId?: string
  ): Promise<IExternalOrder> {
    const updated = await ExternalOrder.findOneAndUpdate(
      { _id: externalOrder._id, tenantId: externalOrder.tenantId },
      {
        status: IntegrationProcessingStatus.MAPPING_REVIEW_REQUIRED,
        failureReason,
        nextRetryAt: null,
        updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
      },
      { new: true }
    );

    if (!updated) {
      throw new Error(failureReason);
    }

    await this.recordIntegrationEvent({
      tenantId: externalOrder.tenantId.toString(),
      outletId: externalOrder.outletId?.toString(),
      connectionId: externalOrder.connectionId?.toString(),
      provider: externalOrder.provider,
      eventType: "ORDER_MAPPING_FAILED",
      externalOrderId: externalOrder.externalOrderId,
      externalOrderRef: externalOrder._id as Types.ObjectId,
      payload: { failureReason },
      status: IntegrationEventStatus.FAILED,
      actorUserId,
    });

    return updated;
  }

  private static async markExternalOrderValidationFailure(
    externalOrder: IExternalOrder,
    failureReason: string,
    actorUserId?: string
  ): Promise<IExternalOrder> {
    const updated = await ExternalOrder.findOneAndUpdate(
      { _id: externalOrder._id, tenantId: externalOrder.tenantId },
      {
        status: IntegrationProcessingStatus.FAILED_VALIDATION,
        failureReason,
        nextRetryAt: null,
        updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
      },
      { new: true }
    );

    if (!updated) {
      throw new Error(failureReason);
    }

    await this.recordIntegrationEvent({
      tenantId: externalOrder.tenantId.toString(),
      outletId: externalOrder.outletId?.toString(),
      connectionId: externalOrder.connectionId?.toString(),
      provider: externalOrder.provider,
      eventType: "ORDER_VALIDATION_FAILED",
      externalOrderId: externalOrder.externalOrderId,
      externalOrderRef: externalOrder._id as Types.ObjectId,
      payload: { failureReason },
      status: IntegrationEventStatus.FAILED,
      actorUserId,
    });

    return updated;
  }

  private static async markExternalOrderFailure(
    externalOrder: IExternalOrder,
    failureReason: string,
    actorUserId?: string
  ): Promise<IExternalOrder> {
    const retryCount = externalOrder.retryCount + 1;
    const shouldDlq = retryCount > externalOrder.maxRetryCount;
    const status = shouldDlq
      ? IntegrationProcessingStatus.DLQ
      : IntegrationProcessingStatus.RETRY_PENDING;

    const nextRetryAt = shouldDlq
      ? null
      : new Date(Date.now() + Math.min(60_000 * retryCount, 15 * 60_000));

    const updated = await ExternalOrder.findOneAndUpdate(
      { _id: externalOrder._id, tenantId: externalOrder.tenantId },
      {
        status,
        failureReason,
        retryCount,
        nextRetryAt,
        dlqReason: shouldDlq ? failureReason : null,
        updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
      },
      { new: true }
    );

    if (!updated) {
      throw new Error(failureReason);
    }

    await this.recordIntegrationEvent({
      tenantId: externalOrder.tenantId.toString(),
      outletId: externalOrder.outletId?.toString(),
      connectionId: externalOrder.connectionId?.toString(),
      provider: externalOrder.provider,
      eventType: shouldDlq ? "ORDER_PROCESSING_DLQ" : "ORDER_PROCESSING_RETRY_PENDING",
      externalOrderId: externalOrder.externalOrderId,
      externalOrderRef: externalOrder._id as Types.ObjectId,
      payload: { failureReason, retryCount },
      status: shouldDlq
        ? IntegrationEventStatus.DLQ
        : IntegrationEventStatus.RETRY_PENDING,
      actorUserId,
    });

    return updated;
  }

  private static async recordIntegrationEvent(args: {
    tenantId: string;
    outletId?: string | undefined;
    connectionId?: string | undefined;
    provider: IntegrationProvider;
    eventType: string;
    externalOrderId?: string | undefined;
    externalOrderRef?: Types.ObjectId;
    payload: unknown;
    status: IntegrationEventStatus;
    actorUserId?: string | undefined;
  }): Promise<void> {
    await IntegrationEvent.create({
      tenantId: new Types.ObjectId(args.tenantId),
      outletId: args.outletId ? new Types.ObjectId(args.outletId) : null,
      connectionId: args.connectionId ? new Types.ObjectId(args.connectionId) : null,
      provider: args.provider,
      direction: IntegrationEventDirection.INTERNAL,
      eventType: args.eventType,
      externalOrderId: args.externalOrderId || null,
      externalOrderRef: args.externalOrderRef || null,
      status: args.status,
      payload: args.payload,
      processedAt: new Date(),
      createdBy: args.actorUserId ? new Types.ObjectId(args.actorUserId) : null,
      updatedBy: args.actorUserId ? new Types.ObjectId(args.actorUserId) : null,
    });
  }

  private static async recordAuditLog(
    tenantId: string,
    actorUserId: string | undefined,
    data: {
      entityType: string;
      entityId: string;
      action: AuditAction;
      oldData?: Record<string, unknown> | null | undefined;
      newData?: Record<string, unknown> | null | undefined;
      ipAddress?: string | undefined;
      userAgent?: string | undefined;
    }
  ): Promise<void> {
    if (!actorUserId) return;

    const auditData: {
      userId: string;
      action: AuditAction;
      entityType: string;
      entityId: string;
      oldData?: Record<string, unknown> | null;
      newData?: Record<string, unknown> | null;
      ipAddress?: string;
      userAgent?: string;
    } = {
      userId: actorUserId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
    };

    if (data.oldData !== undefined) auditData.oldData = data.oldData;
    if (data.newData !== undefined) auditData.newData = data.newData;
    if (data.ipAddress !== undefined) auditData.ipAddress = data.ipAddress;
    if (data.userAgent !== undefined) auditData.userAgent = data.userAgent;

    await AuditLogService.createAuditLog(tenantId, auditData);
  }

  private static assertObjectId(value: string, field: string): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${field} format`);
    }
  }
}


