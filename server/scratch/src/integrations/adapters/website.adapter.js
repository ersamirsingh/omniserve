import { BaseAdapter } from "./base.adapter.js";
import { IntegrationProvider } from "../../types/integration.type.js";
export class WebsiteAdapter extends BaseAdapter {
    provider = IntegrationProvider.WEBSITE;
    async normalizeOrder(args) {
        const payload = args.payload;
        if (!payload.orderId) {
            throw new Error("Missing orderId in Website payload");
        }
        return {
            source: "WEBSITE",
            provider: this.provider,
            externalOrderId: String(payload.orderId),
            tenantId: args.tenantId,
            outletId: payload.outletId || "",
            customer: {
                name: payload.customer?.name || "Guest Customer",
                phone: payload.customer?.phone || "0000000000",
                ...(payload.customer?.email ? { email: String(payload.customer.email) } : {}),
                ...(payload.fulfillment?.address ? {
                    address: {
                        line1: payload.fulfillment.address.line1,
                        line2: payload.fulfillment.address.line2,
                        city: payload.fulfillment.address.city,
                        state: payload.fulfillment.address.state,
                        pincode: payload.fulfillment.address.pincode
                    }
                } : {})
            },
            fulfillment: {
                type: payload.fulfillment?.type || "DELIVERY",
                ...(payload.fulfillment?.scheduledFor ? {
                    expectedPickupAt: new Date(payload.fulfillment.scheduledFor).toISOString(),
                    scheduledFor: new Date(payload.fulfillment.scheduledFor)
                } : {}),
                ...(payload.fulfillment?.addressId ? { addressId: String(payload.fulfillment.addressId) } : {}),
                ...(payload.fulfillment?.instructions ? { instructions: String(payload.fulfillment.instructions) } : {}),
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
                externalItemId: String(item.menuItemId),
                menuItemId: String(item.menuItemId),
                name: item.name,
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.price || 0),
                ...(item.variantId ? { externalVariantId: String(item.variantId), variantId: String(item.variantId) } : {}),
                addons: (item.addons || []).map((addon) => ({
                    externalAddonId: String(addon.addonId),
                    addonId: String(addon.addonId),
                    name: addon.name,
                    price: Number(addon.price || 0)
                })),
                ...(item.notes ? { notes: String(item.notes) } : {})
            })),
            ...(payload.notes ? { notes: String(payload.notes) } : {})
        };
    }
}
