import { Types } from "mongoose";
import Customer from "../../models/customer.model.js";

export class CustomerResolutionService {
  /**
   * Resolves a customer by phone. If not found, creates one.
   */
  static async resolveCustomer(args: {
    tenantId: string;
    phone: string;
    name?: string | undefined;
    email?: string | undefined;
    address?: {
      line1?: string | undefined;
      city?: string | undefined;
      state?: string | undefined;
      pincode?: string | undefined;
    } | undefined;
  }): Promise<string> {
    const tenantObjectId = new Types.ObjectId(args.tenantId);
    const phoneClean = args.phone.trim();

    let customer = await Customer.findOne({
      tenantId: tenantObjectId,
      phone: phoneClean,
      isDeleted: false,
    });

    if (!customer) {
      const nameParts = (args.name || "Guest Customer").trim().split(" ");
      const firstName = nameParts[0] || "Guest";
      const lastName = nameParts.slice(1).join(" ") || undefined;

      const addressList = [];
      if (args.address?.line1 || args.address?.city) {
        addressList.push({
          label: "External Address",
          line1: args.address.line1,
          city: args.address.city,
          state: args.address.state,
          pincode: args.address.pincode && /^\d{6}$/.test(args.address.pincode) ? args.address.pincode : undefined,
          isDefault: true,
          location: {
            type: "Point" as const,
            coordinates: [0, 0] as [number, number]
          }
        });
      }

      customer = await Customer.create({
        tenantId: tenantObjectId,
        firstName,
        lastName,
        phone: phoneClean,
        email: args.email ? args.email.trim().toLowerCase() : undefined,
        address: addressList,
        totalOrders: 0,
        totalSpent: 0,
        isActive: true,
      });
    } else if (args.name && args.name.trim() !== "" && args.name !== "Guest Customer") {
      const nameParts = args.name.trim().split(" ");
      const firstName = nameParts[0] || "Guest";
      const lastName = nameParts.slice(1).join(" ") || "";

      customer.firstName = firstName;
      customer.lastName = lastName;
      await customer.save();
    }

    return (customer._id as Types.ObjectId).toString();
  }
}
