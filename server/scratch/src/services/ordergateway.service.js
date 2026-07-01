import { Types } from "mongoose";
import { AuditAction, OrderSource } from "../enums/enums.js";
import ExternalOrder from "../models/externalorder.model.js";
import IntegrationEvent from "../models/integrationevent.model.js";
import QRSession from "../models/qrsession.model.js";
import Table from "../models/table.model.js";
import { IntegrationEventDirection, IntegrationEventStatus, IntegrationProcessingStatus, } from "../types/integration.type.js";
import { AuditLogService } from "./auditlog.service.js";
import { OrderService } from "./order.service.js";
import { CustomerResolutionService } from "./customer-resolution.service.js";
import { MappingResolutionService } from "./mapping-resolution.service.js";
export class OrderGatewayService {
    static adapters = new Map();
    static registerAdapter(adapter) {
        this.adapters.set(String(adapter.provider).toUpperCase(), adapter);
    }
    static getAdapter(provider) {
        const adapter = this.adapters.get(String(provider).toUpperCase());
        if (!adapter) {
            throw new Error(`No integration adapter registered for provider ${provider}`);
        }
        return adapter;
    }
    static getRegisteredProviders() {
        return Array.from(this.adapters.keys());
    }
    static async ingestExternalOrder(input) {
        this.assertObjectId(input.tenantId, "tenantId");
        if (input.outletId)
            this.assertObjectId(input.outletId, "outletId");
        if (input.connectionId)
            this.assertObjectId(input.connectionId, "connectionId");
        if (input.actorUserId)
            this.assertObjectId(input.actorUserId, "actorUserId");
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
                externalOrderRef: existing._id,
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
            externalOrderRef: externalOrder._id,
            payload: input.rawPayload,
            status: IntegrationEventStatus.SUCCESS,
            actorUserId: input.actorUserId,
        });
        await this.recordAuditLog(input.tenantId, input.actorUserId, {
            entityId: externalOrder._id.toString(),
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
    static async processExternalOrder(input) {
        this.assertObjectId(input.externalOrderId, "externalOrderId");
        this.assertObjectId(input.tenantId, "tenantId");
        if (input.actorUserId)
            this.assertObjectId(input.actorUserId, "actorUserId");
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
        await ExternalOrder.updateOne({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
            status: IntegrationProcessingStatus.NORMALIZING,
            failureReason: null,
            updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
        });
        try {
            const rawPay = externalOrder.rawPayload;
            if (rawPay && rawPay._chaosMode) {
                if (rawPay._chaosMode === "VALIDATION_ERROR") {
                    throw new Error("ValidationError: Chaos mode active - invalid payload fields");
                }
                else if (rawPay._chaosMode === "MAPPING_ERROR") {
                    throw new Error("MAPPING_ERROR: Chaos mode active - menu item mapping missing");
                }
                else if (rawPay._chaosMode === "DLQ_ERROR") {
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
            const internalOutletId = await MappingResolutionService.resolveOutletId(canonicalOrder.tenantId, canonicalOrder.provider, canonicalOrder.outletId);
            canonicalOrder.outletId = internalOutletId;
            const internalPayload = await this.toInternalOrderPayload(canonicalOrder);
            await ExternalOrder.updateOne({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
                outletId: new Types.ObjectId(internalOutletId),
                canonicalPayload: canonicalOrder,
                status: IntegrationProcessingStatus.NORMALIZED,
                updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
            });
            const order = await OrderService.placeOrder(externalOrder.tenantId.toString(), internalPayload, input.actorUserId);
            const placedOrder = await ExternalOrder.findOneAndUpdate({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
                internalOrderId: order._id,
                status: IntegrationProcessingStatus.PLACED,
                processedAt: new Date(),
                failureReason: null,
                updatedBy: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
            }, { new: true });
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
                externalOrderRef: externalOrder._id,
                payload: {
                    internalOrderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                },
                status: IntegrationEventStatus.SUCCESS,
                actorUserId: input.actorUserId,
            });
            await this.recordAuditLog(input.tenantId, input.actorUserId, {
                entityId: placedOrder._id.toString(),
                entityType: "ExternalOrder",
                action: AuditAction.STATUS_CHANGE,
                newData: {
                    internalOrderId: order._id.toString(),
                    status: IntegrationProcessingStatus.PLACED,
                },
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });
            return placedOrder;
        }
        catch (error) {
            console.error("Error processing external order:", error);
            const errorMessage = error.message || "";
            if (errorMessage.includes("MAPPING_ERROR")) {
                return await this.markExternalOrderMappingReviewRequired(externalOrder, errorMessage, input.actorUserId);
            }
            if (errorMessage.includes("ValidationError") || errorMessage.includes("validation")) {
                return await this.markExternalOrderValidationFailure(externalOrder, errorMessage, input.actorUserId);
            }
            return await this.markExternalOrderFailure(externalOrder, errorMessage || "External order processing failed", input.actorUserId);
        }
    }
    static async replayExternalOrder(externalOrderId, tenantId, actorUserId) {
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
        if (externalOrder.status !== IntegrationProcessingStatus.MAPPING_REVIEW_REQUIRED &&
            externalOrder.status !== IntegrationProcessingStatus.FAILED_VALIDATION &&
            externalOrder.status !== IntegrationProcessingStatus.RETRY_PENDING &&
            externalOrder.status !== IntegrationProcessingStatus.DLQ) {
            throw new Error(`External order in status ${externalOrder.status} cannot be replayed`);
        }
        // Reset external order to RECEIVED status
        await ExternalOrder.updateOne({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
            status: IntegrationProcessingStatus.RECEIVED,
            failureReason: null,
            retryCount: 0,
            nextRetryAt: null,
            updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
        });
        await this.recordIntegrationEvent({
            tenantId,
            outletId: externalOrder.outletId?.toString(),
            connectionId: externalOrder.connectionId?.toString(),
            provider: externalOrder.provider,
            eventType: "ORDER_REPLAY_TRIGGERED",
            externalOrderId: externalOrder.externalOrderId,
            externalOrderRef: externalOrder._id,
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
    static async toInternalOrderPayload(canonicalOrder) {
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
        const items = await Promise.all(canonicalOrder.items.map(item => this.resolveInternalItem(canonicalOrder, item)));
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
        let sessionId = undefined;
        if (canonicalOrder.fulfillment.tableId && Types.ObjectId.isValid(canonicalOrder.fulfillment.tableId)) {
            const table = await Table.findOne({ _id: new Types.ObjectId(canonicalOrder.fulfillment.tableId), isDeleted: false });
            if (table && table.activeSessionId) {
                const activeSession = await QRSession.findById(table.activeSessionId);
                if (activeSession && activeSession.status !== "CLOSED" && activeSession.status !== "EXPIRED") {
                    sessionId = activeSession._id.toString();
                }
            }
        }
        const payload = {
            outletId: canonicalOrder.outletId,
            customerId,
            source: this.mapCanonicalSourceToInternal(canonicalOrder),
            subtotal: canonicalOrder.pricing.subtotal,
            tax: canonicalOrder.pricing.tax,
            deliveryFee: canonicalOrder.pricing.deliveryFee,
            discount: canonicalOrder.pricing.discount,
            totalAmount: canonicalOrder.pricing.totalAmount,
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
    static async resolveInternalItem(canonicalOrder, item) {
        const menuItemId = item.menuItemId || await this.resolveMenuItemId(canonicalOrder, item);
        const variantId = item.variantId || await this.resolveVariantId(canonicalOrder, item);
        const addons = await Promise.all((item.addons || []).map(addon => this.resolveInternalAddon(canonicalOrder, item, addon)));
        const resolvedItem = {
            menuItemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        };
        if (variantId)
            resolvedItem.variantId = variantId;
        if (addons.length > 0)
            resolvedItem.addons = addons;
        if (item.notes)
            resolvedItem.notes = item.notes;
        return resolvedItem;
    }
    static async resolveMenuItemId(canonicalOrder, item) {
        if (!item.externalItemId) {
            throw new Error(`MAPPING_ERROR: Missing menuItemId or externalItemId for item ${item.name}`);
        }
        return await MappingResolutionService.resolveMenuItemId(canonicalOrder.tenantId, canonicalOrder.outletId, String(canonicalOrder.provider), item.externalItemId);
    }
    static async resolveVariantId(canonicalOrder, item) {
        if (!item.externalVariantId) {
            return undefined;
        }
        return await MappingResolutionService.resolveVariantId(canonicalOrder.tenantId, canonicalOrder.outletId, String(canonicalOrder.provider), item.externalVariantId);
    }
    static async resolveInternalAddon(canonicalOrder, item, addon) {
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
        const addonId = await MappingResolutionService.resolveAddonId(canonicalOrder.tenantId, canonicalOrder.outletId, String(canonicalOrder.provider), addon.externalAddonId);
        return {
            addonId,
            name: addon.name,
            price: addon.price,
        };
    }
    static mapCanonicalSourceToInternal(canonicalOrder) {
        const provStr = String(canonicalOrder.provider || "").toUpperCase();
        if (provStr === "QR" || provStr === "QR_DINE_IN")
            return OrderSource.QR_DINE_IN;
        if (provStr === "SWIGGY" || provStr === "MOCK_SWIGGY")
            return OrderSource.SWIGGY;
        if (provStr === "ZOMATO" || provStr === "MOCK_ZOMATO")
            return OrderSource.ZOMATO;
        if (provStr === "POS")
            return OrderSource.POS;
        if (provStr === "WEBSITE")
            return OrderSource.WEBSITE;
        if (canonicalOrder.fulfillment.type === "DINE_IN")
            return OrderSource.DINE_IN;
        if (canonicalOrder.fulfillment.type === "TAKEAWAY")
            return OrderSource.TAKEAWAY;
        if (canonicalOrder.fulfillment.type === "DELIVERY")
            return OrderSource.DELIVERY;
        return OrderSource.ONLINE;
    }
    static async markExternalOrderMappingReviewRequired(externalOrder, failureReason, actorUserId) {
        const updated = await ExternalOrder.findOneAndUpdate({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
            status: IntegrationProcessingStatus.MAPPING_REVIEW_REQUIRED,
            failureReason,
            nextRetryAt: null,
            updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
        }, { new: true });
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
            externalOrderRef: externalOrder._id,
            payload: { failureReason },
            status: IntegrationEventStatus.FAILED,
            actorUserId,
        });
        return updated;
    }
    static async markExternalOrderValidationFailure(externalOrder, failureReason, actorUserId) {
        const updated = await ExternalOrder.findOneAndUpdate({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
            status: IntegrationProcessingStatus.FAILED_VALIDATION,
            failureReason,
            nextRetryAt: null,
            updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
        }, { new: true });
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
            externalOrderRef: externalOrder._id,
            payload: { failureReason },
            status: IntegrationEventStatus.FAILED,
            actorUserId,
        });
        return updated;
    }
    static async markExternalOrderFailure(externalOrder, failureReason, actorUserId) {
        const retryCount = externalOrder.retryCount + 1;
        const shouldDlq = retryCount > externalOrder.maxRetryCount;
        const status = shouldDlq
            ? IntegrationProcessingStatus.DLQ
            : IntegrationProcessingStatus.RETRY_PENDING;
        const nextRetryAt = shouldDlq
            ? null
            : new Date(Date.now() + Math.min(60_000 * retryCount, 15 * 60_000));
        const updated = await ExternalOrder.findOneAndUpdate({ _id: externalOrder._id, tenantId: externalOrder.tenantId }, {
            status,
            failureReason,
            retryCount,
            nextRetryAt,
            dlqReason: shouldDlq ? failureReason : null,
            updatedBy: actorUserId ? new Types.ObjectId(actorUserId) : null,
        }, { new: true });
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
            externalOrderRef: externalOrder._id,
            payload: { failureReason, retryCount },
            status: shouldDlq
                ? IntegrationEventStatus.DLQ
                : IntegrationEventStatus.RETRY_PENDING,
            actorUserId,
        });
        return updated;
    }
    static async recordIntegrationEvent(args) {
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
    static async recordAuditLog(tenantId, actorUserId, data) {
        if (!actorUserId)
            return;
        const auditData = {
            userId: actorUserId,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
        };
        if (data.oldData !== undefined)
            auditData.oldData = data.oldData;
        if (data.newData !== undefined)
            auditData.newData = data.newData;
        if (data.ipAddress !== undefined)
            auditData.ipAddress = data.ipAddress;
        if (data.userAgent !== undefined)
            auditData.userAgent = data.userAgent;
        await AuditLogService.createAuditLog(tenantId, auditData);
    }
    static assertObjectId(value, field) {
        if (!Types.ObjectId.isValid(value)) {
            throw new Error(`Invalid ${field} format`);
        }
    }
}
