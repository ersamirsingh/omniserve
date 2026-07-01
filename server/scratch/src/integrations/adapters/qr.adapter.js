import { BaseAdapter } from "./base.adapter.js";
import { IntegrationProvider } from "../../types/integration.type.js";
export class QrAdapter extends BaseAdapter {
    provider = IntegrationProvider.QR;
    async normalizeOrder(args) {
        const payload = args.payload;
        if (!payload.orderId) {
            throw new Error("Missing orderId in QR payload");
        }
        return {
            source: "QR_DINE_IN",
            provider: this.provider,
            externalOrderId: String(payload.orderId),
            tenantId: args.tenantId,
            outletId: payload.outletId || "",
            customer: {
                name: payload.customer?.name || "Guest Customer",
                phone: payload.customer?.phone || "0000000000",
                ...(payload.customer?.email ? { email: String(payload.customer.email) } : {})
            },
            fulfillment: {
                type: "DINE_IN",
                ...(payload.fulfillment?.tableNumber ? { tableNumber: String(payload.fulfillment.tableNumber) } : {}),
                ...(payload.fulfillment?.tableId ? { tableId: String(payload.fulfillment.tableId) } : {}),
                ...(payload.fulfillment?.seatNumber ? { seatNumber: String(payload.fulfillment.seatNumber) } : {})
            },
            payment: {
                mode: payload.payment?.mode || "ONLINE",
                status: payload.payment?.status || "PENDING",
                ...(payload.payment?.transactionId ? { transactionId: String(payload.payment.transactionId) } : {})
            },
            pricing: {
                subtotal: Number(payload.pricing?.subtotal || 0),
                tax: Number(payload.pricing?.tax || 0),
                deliveryFee: Number(payload.pricing?.deliveryFee || 0),
                discount: Number(payload.pricing?.discount || 0),
                totalAmount: Number(payload.pricing?.totalAmount || 0)
            },
            items: (payload.items || []).map((item) => ({
                externalItemId: String(item.itemId),
                name: item.name,
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.price || 0),
                ...(item.variantId ? { externalVariantId: String(item.variantId) } : {}),
                addons: (item.addons || []).map((addon) => ({
                    externalAddonId: String(addon.addonId),
                    name: addon.name,
                    price: Number(addon.price || 0)
                }))
            })),
            ...(payload.notes ? { notes: String(payload.notes) } : {})
        };
    }
}
