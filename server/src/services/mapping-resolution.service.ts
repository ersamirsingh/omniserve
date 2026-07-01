import { Types } from "mongoose";
import ChannelOutletMapping from "../models/channeloutletmapping.model.js";
import ChannelMenuItemMapping from "../models/channelmenuitemmapping.model.js";
import ChannelVariantMapping from "../models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../models/channeladdonmapping.model.js";

export class MappingResolutionService {
  /**
   * Resolves internal outletId via ChannelOutletMapping
   */
  static async resolveOutletId(
    tenantId: string,
    provider: string,
    externalOutletId: string
  ): Promise<string> {
    const prov = String(provider).toUpperCase();
    if (prov === "QR" || prov === "WEBSITE" || prov === "POS" || prov === "QR_DINE_IN") {
      return externalOutletId;
    }

    const mapping = await ChannelOutletMapping.findOne({
      tenantId: new Types.ObjectId(tenantId),
      provider: String(provider).toUpperCase(),
      externalOutletId: String(externalOutletId),
      isActive: true,
      isDeleted: false,
    });

    if (!mapping) {
      throw new Error(`MAPPING_ERROR: Outlet mapping missing for external outlet ID: ${externalOutletId}`);
    }

    return mapping.outletId.toString();
  }

  /**
   * Resolves internal menuItemId via ChannelMenuItemMapping
   */
  static async resolveMenuItemId(
    tenantId: string,
    outletId: string,
    provider: string,
    externalItemId: string
  ): Promise<string> {
    const prov = String(provider).toUpperCase();
    if (prov === "QR" || prov === "WEBSITE" || prov === "POS" || prov === "QR_DINE_IN") {
      return externalItemId;
    }

    const mapping = await ChannelMenuItemMapping.findOne({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      provider: String(provider).toUpperCase(),
      externalItemId: String(externalItemId),
      isActive: true,
      isDeleted: false,
    });

    if (!mapping) {
      throw new Error(`MAPPING_ERROR: Item mapping missing for external item ID: ${externalItemId}`);
    }

    return mapping.menuItemId.toString();
  }

  /**
   * Resolves internal variantId via ChannelVariantMapping
   */
  static async resolveVariantId(
    tenantId: string,
    outletId: string,
    provider: string,
    externalVariantId: string
  ): Promise<string> {
    const prov = String(provider).toUpperCase();
    if (prov === "QR" || prov === "WEBSITE" || prov === "POS" || prov === "QR_DINE_IN") {
      return externalVariantId;
    }

    const mapping = await ChannelVariantMapping.findOne({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      provider: String(provider).toUpperCase(),
      externalVariantId: String(externalVariantId),
      isActive: true,
      isDeleted: false,
    });

    if (!mapping) {
      throw new Error(`MAPPING_ERROR: Variant mapping missing for external variant ID: ${externalVariantId}`);
    }

    return mapping.variantId.toString();
  }

  /**
   * Resolves internal addonId via ChannelAddonMapping
   */
  static async resolveAddonId(
    tenantId: string,
    outletId: string,
    provider: string,
    externalAddonId: string
  ): Promise<string> {
    const prov = String(provider).toUpperCase();
    if (prov === "QR" || prov === "WEBSITE" || prov === "POS" || prov === "QR_DINE_IN") {
      return externalAddonId;
    }

    const mapping = await ChannelAddonMapping.findOne({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      provider: String(provider).toUpperCase(),
      externalAddonId: String(externalAddonId),
      isActive: true,
      isDeleted: false,
    });

    if (!mapping) {
      throw new Error(`MAPPING_ERROR: Addon mapping missing for external addon ID: ${externalAddonId}`);
    }

    return mapping.addonId.toString();
  }
}
