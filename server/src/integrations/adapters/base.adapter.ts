import crypto from "crypto";
import { OrderStatus } from "../../enums/enums.js";
import {
  IntegrationAdapter,
  AdapterVerifySignatureArgs,
  AdapterNormalizeOrderArgs,
  CanonicalOrder,
  AdapterBuildMenuPayloadArgs,
  AdapterBuildInventoryPayloadArgs,
  IntegrationProvider
} from "../../types/integration.type.js";

export abstract class BaseAdapter implements IntegrationAdapter {
  abstract provider: IntegrationProvider | string;

  async verifySignature(args: AdapterVerifySignatureArgs): Promise<boolean> {
    if (!args.secret) return true; // Bypass signature if no secret configured (local testing)
    const signature = args.headers["x-signature"] || args.headers["X-Signature"];
    if (!signature) return false;

    try {
      const expectedSig = crypto
        .createHmac("sha256", args.secret)
        .update(args.rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(String(signature));
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  abstract normalizeOrder(args: AdapterNormalizeOrderArgs): Promise<CanonicalOrder>;

  mapStatusToInternal(providerStatus: string): OrderStatus | null {
    switch (providerStatus.toUpperCase()) {
      case "ACCEPTED":
      case "CONFIRMED":
        return OrderStatus.ACCEPTED;
      case "READY":
      case "PREPARED":
        return OrderStatus.READY;
      case "PICKED_UP":
      case "DISPATCHED":
        return OrderStatus.PICKED_UP;
      case "DELIVERED":
      case "COMPLETED":
        return OrderStatus.DELIVERED;
      case "CANCELLED":
        return OrderStatus.CANCELLED;
      default:
        return null;
    }
  }

  mapStatusToProvider(internalStatus: OrderStatus): string {
    switch (internalStatus) {
      case OrderStatus.ACCEPTED:
        return "CONFIRMED";
      case OrderStatus.READY:
        return "PREPARED";
      case OrderStatus.PICKED_UP:
        return "PICKED_UP";
      case OrderStatus.DELIVERED:
        return "DELIVERED";
      case OrderStatus.CANCELLED:
        return "CANCELLED";
      default:
        return "PENDING";
    }
  }

  async buildMenuPayload(args: AdapterBuildMenuPayloadArgs): Promise<unknown> {
    return {
      provider: this.provider,
      outletId: args.outletId,
      items: args.menuItems,
      categories: args.categories,
      variants: args.variants,
      addons: args.addons
    };
  }

  async buildInventoryPayload(args: AdapterBuildInventoryPayloadArgs): Promise<unknown> {
    return {
      provider: this.provider,
      outletId: args.outletId,
      changedItems: args.changedItems
    };
  }
}
