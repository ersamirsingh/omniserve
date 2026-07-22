import { Types } from "mongoose";
import ChannelOutletMapping from "../../models/channeloutletmapping.model.js";
import ChannelMenuItemMapping from "../../models/channelmenuitemmapping.model.js";
import ChannelVariantMapping from "../../models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../../models/channeladdonmapping.model.js";
import Outlet from "../../models/outlet.model.js";
import MenuItem from "../../models/menuItem.model.js";

export class MappingResolutionService {

  static async resolveOutletId(
    tenantId: string,
    provider: string,
    externalOutletId: string
  ): Promise<string> {
    const prov = String(provider).toUpperCase();
    if (prov === "QR" || prov === "WEBSITE" || prov === "POS" || prov === "QR_DINE_IN") {
      return externalOutletId;
    }

    if (prov.startsWith("MOCK") && externalOutletId && Types.ObjectId.isValid(externalOutletId)) {
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
      if (prov.startsWith("MOCK")) {
        const fallbackOutlet = await Outlet.findOne({ tenantId: new Types.ObjectId(tenantId), isDeleted: false });
        if (fallbackOutlet) {
          return fallbackOutlet._id.toString();
        }
      }
      throw new Error(`MAPPING_ERROR: Outlet mapping missing for external outlet ID: ${externalOutletId}`);
    }

    return mapping.outletId.toString();
  }

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

    if (prov.startsWith("MOCK") && externalItemId && Types.ObjectId.isValid(externalItemId)) {
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
      if (prov.startsWith("MOCK")) {
        const fallbackItem = await MenuItem.findOne({ tenantId: new Types.ObjectId(tenantId), isDeleted: false });
        if (fallbackItem) {
          return fallbackItem._id.toString();
        }
      }
      throw new Error(`MAPPING_ERROR: Item mapping missing for external item ID: ${externalItemId}`);
    }

    return mapping.menuItemId.toString();
  }

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
      if (prov.startsWith("MOCK")) {
        return externalVariantId;
      }
      throw new Error(`MAPPING_ERROR: Variant mapping missing for external variant ID: ${externalVariantId}`);
    }

    return mapping.variantId.toString();
  }

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
      if (prov.startsWith("MOCK")) {
        return externalAddonId;
      }
      throw new Error(`MAPPING_ERROR: Addon mapping missing for external addon ID: ${externalAddonId}`);
    }

    return mapping.addonId.toString();
  }
}
