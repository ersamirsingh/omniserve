import { BaseAdapter } from "./base.adapter.js";
import {
  AdapterNormalizeOrderArgs,
  CanonicalOrder,
  IntegrationProvider
} from "../../types/integration.type.js";

export class MockSwiggyAdapter extends BaseAdapter {
  provider = IntegrationProvider.MOCK_SWIGGY;

  async normalizeOrder(args: AdapterNormalizeOrderArgs): Promise<CanonicalOrder> {
    const payload = args.payload as any;

    if (!payload.order_id) {
      throw new Error("Missing order_id in Swiggy payload");
    }

    return {
      source: "MOCK_SWIGGY",
      provider: this.provider,
      externalOrderId: String(payload.order_id),
      tenantId: args.tenantId,
      outletId: payload.outlet_id || "",
      customer: {
        externalCustomerId: payload.customer?.phone,
        name: payload.customer?.name || "Guest Customer",
        phone: payload.customer?.phone || "0000000000",
        email: payload.customer?.email,
        ...(payload.delivery_address ? {
          address: {
            line1: payload.delivery_address.line1,
            city: payload.delivery_address.city,
            state: payload.delivery_address.state,
            pincode: payload.delivery_address.pincode
          }
        } : {})
      },
      fulfillment: {
        type: "DELIVERY",
        deliveryPartner: "SWIGGY"
      },
      payment: {
        mode: payload.payment?.mode || "ONLINE",
        status: payload.payment?.status === "PAID" ? "SUCCESS" : "PENDING",
        transactionId: payload.payment?.transaction_id
      },
      pricing: {
        subtotal: Number(payload.pricing?.subtotal || 0),
        tax: Number(payload.pricing?.tax || 0),
        deliveryFee: Number(payload.pricing?.delivery_fee || 0),
        discount: Number(payload.pricing?.discount || 0),
        packagingFee: Number(payload.pricing?.packaging_fee || 0),
        totalAmount: Number(payload.pricing?.total_amount || 0)
      },
      items: (payload.items || []).map((item: any) => ({
        externalItemId: String(item.item_id),
        externalVariantId: item.variant_id ? String(item.variant_id) : undefined,
        name: item.name,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.price || 0),
        addons: (item.addons || []).map((addon: any) => ({
          externalAddonId: String(addon.addon_id),
          name: addon.name,
          price: Number(addon.price || 0)
        }))
      })),
      notes: payload.notes
    };
  }
}
