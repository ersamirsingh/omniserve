import { BaseAdapter } from "./base.adapter.js";
import {
  AdapterNormalizeOrderArgs,
  CanonicalOrder,
  IntegrationProvider
} from "../../types/integration.type.js";

export class MockZomatoAdapter extends BaseAdapter {
  provider = IntegrationProvider.MOCK_ZOMATO;

  async normalizeOrder(args: AdapterNormalizeOrderArgs): Promise<CanonicalOrder> {
    const payload = args.payload as any;

    if (!payload.orderId) {
      throw new Error("Missing orderId in Zomato payload");
    }

    return {
      source: "MOCK_ZOMATO",
      provider: this.provider,
      externalOrderId: String(payload.orderId),
      tenantId: args.tenantId,
      outletId: payload.outletCode || "",
      customer: {
        externalCustomerId: payload.customerDetails?.customerPhone,
        name: payload.customerDetails?.customerName || "Guest Customer",
        phone: payload.customerDetails?.customerPhone || "0000000000",
        email: payload.customerDetails?.customerEmail,
        ...(payload.deliveryInfo ? {
          address: {
            line1: payload.deliveryInfo.addressLine,
            city: payload.deliveryInfo.cityName,
            pincode: payload.deliveryInfo.postalCode
          }
        } : {})
      },
      fulfillment: {
        type: "DELIVERY",
        deliveryPartner: "ZOMATO"
      },
      payment: {
        mode: payload.paymentDetails?.paymentMethod || "ONLINE",
        status: payload.paymentDetails?.isPaid ? "SUCCESS" : "PENDING",
        transactionId: payload.paymentDetails?.txId
      },
      pricing: {
        subtotal: Number(payload.billDetails?.totalBill || 0) - Number(payload.billDetails?.taxes || 0) - Number(payload.billDetails?.deliveryCharge || 0) + Number(payload.billDetails?.promoDiscount || 0),
        tax: Number(payload.billDetails?.taxes || 0),
        deliveryFee: Number(payload.billDetails?.deliveryCharge || 0),
        discount: Number(payload.billDetails?.promoDiscount || 0),
        packagingFee: Number(payload.billDetails?.packingCharge || 0),
        totalAmount: Number(payload.billDetails?.totalBill || 0)
      },
      items: (payload.cart?.items || []).map((item: any) => ({
        externalItemId: String(item.itemId),
        externalVariantId: item.variantCode ? String(item.variantCode) : undefined,
        name: item.title,
        quantity: Number(item.qty || 1),
        unitPrice: Number(item.rate || 0),
        addons: (item.extraAddons || []).map((addon: any) => ({
          externalAddonId: String(addon.addonCode),
          name: addon.title,
          price: Number(addon.charge || 0)
        }))
      })),
      notes: payload.instructions
    };
  }
}
