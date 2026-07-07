import { Types } from 'mongoose';
import Customer, { ICustomer, IAddress } from "../../models/customer.model.js";
import { escapeRegex } from "../../utils/sanitize.utils.js";

export class CustomerService {
  /**
   * Helper to verify if phone or email are already taken by another active customer
   */
  private static async checkConflicts(
    tenantId: string,
    phone: string,
    email?: string,
    excludeCustomerId?: string
  ): Promise<void> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    
    // Check phone conflict
    const phoneConflictQuery: any = {
      tenantId: tenantObjectId,
      phone,
      isDeleted: false,
    };
    if (excludeCustomerId) {
      phoneConflictQuery._id = { $ne: new Types.ObjectId(excludeCustomerId) };
    }
    const phoneExists = await Customer.findOne(phoneConflictQuery);
    if (phoneExists) {
      throw new Error('A customer with this phone number already exists under this tenant.');
    }

    // Check email conflict
    if (email) {
      const emailConflictQuery: any = {
        tenantId: tenantObjectId,
        email: email.trim().toLowerCase(),
        isDeleted: false,
      };
      if (excludeCustomerId) {
        emailConflictQuery._id = { $ne: new Types.ObjectId(excludeCustomerId) };
      }
      const emailExists = await Customer.findOne(emailConflictQuery);
      if (emailExists) {
        throw new Error('A customer with this email address already exists under this tenant.');
      }
    }
  }

  /**
   * Upsert Customer:
   * 1. Search by phone + tenantId.
   * 2. If not found, search by email + tenantId (if email is provided).
   * 3. If found, update the customer.
   * 4. If not found, create a new customer.
   */
  static async upsertCustomer(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<{ customer: ICustomer; isNew: boolean }> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const phoneClean = data.phone.trim();
    const emailClean = data.email ? data.email.trim().toLowerCase() : undefined;

    let customer: ICustomer | null = null;

    // 1. Search by phone
    customer = await Customer.findOne({
      tenantId: tenantObjectId,
      phone: phoneClean,
      isDeleted: false,
    });

    // 2. Search by email if not found by phone
    if (!customer && emailClean) {
      customer = await Customer.findOne({
        tenantId: tenantObjectId,
        email: emailClean,
        isDeleted: false,
      });
    }

    if (customer) {
      // Perform conflict checks before updating
      await this.checkConflicts(tenantId, phoneClean, emailClean, customer._id.toString());

      // Update fields
      customer.firstName = data.firstName;
      if (data.lastName !== undefined) customer.lastName = data.lastName;
      customer.phone = phoneClean;
      if (emailClean !== undefined) customer.email = emailClean;
      customer.updatedBy = userId ? new Types.ObjectId(userId) : null;

      // Handle address if passed in the body
      if (data.address) {
        const isFirst = customer.address.length === 0;
        const newAddress: any = {
          ...data.address,
          isDefault: data.address.isDefault !== undefined ? !!data.address.isDefault : isFirst,
        };

        if (newAddress.isDefault) {
          customer.address.forEach((addr: any) => {
            addr.isDefault = false;
          });
        }
        customer.address.push(newAddress);
      }

      const savedCustomer = await customer.save();
      return { customer: savedCustomer, isNew: false };
    } else {
      // Verify no conflicts for a new customer
      await this.checkConflicts(tenantId, phoneClean, emailClean);

      // Create new customer
      const newCustomer = new Customer({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: phoneClean,
        email: emailClean,
        tenantId: tenantObjectId,
        address: [],
        totalOrders: 0,
        totalSpent: 0,
        isDeleted: false,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      });

      // Handle address if passed in the body
      if (data.address) {
        const newAddress = {
          ...data.address,
          isDefault: true, // first address must be default
        };
        newCustomer.address.push(newAddress);
      }

      const savedCustomer = await newCustomer.save();
      return { customer: savedCustomer, isNew: true };
    }
  }

  /**
   * List customers with pagination and search (first/last name, phone, email)
   */
  static async getCustomers(
    tenantId: string,
    filters: { limit: number; skip: number; search?: string }
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.search) {
      const safeSearch = escapeRegex(filters.search);
      const regex = new RegExp(safeSearch, 'i');
      query.$or = [
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Customer.countDocuments(query),
    ]);

    return { customers, total };
  }

  /**
   * Retrieve customer details by ID (tenant isolated)
   */
  static async getCustomerById(id: string, tenantId: string): Promise<ICustomer | null> {
    return await Customer.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Update Customer details (PUT replacement)
   */
  static async updateCustomer(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<ICustomer | null> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!customer) {
      return null;
    }

    const phoneClean = data.phone.trim();
    const emailClean = data.email ? data.email.trim().toLowerCase() : undefined;

    // Check conflicts excluding the current customer
    await this.checkConflicts(tenantId, phoneClean, emailClean, id);

    customer.firstName = data.firstName;
    customer.lastName = data.lastName;
    customer.phone = phoneClean;
    customer.email = emailClean;
    customer.updatedBy = userId ? new Types.ObjectId(userId) : null;

    return await customer.save();
  }

  /**
   * Soft-delete customer
   */
  static async deleteCustomer(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<ICustomer | null> {
    /**
     * Future Order integration point:
     * When deleting a customer, we could verify if they have any active pending orders.
     * e.g.:
     * const activeOrders = await Order.countDocuments({ customerId: id, orderStatus: { $ne: OrderStatus.DELIVERED } });
     * if (activeOrders > 0) throw new Error("Cannot delete customer with active orders");
     */
    return await Customer.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }

  /**
   * Add a new Address to a Customer
   */
  static async addAddress(
    customerId: string,
    tenantId: string,
    addressData: any,
    userId?: string
  ): Promise<IAddress | null> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!customer) {
      return null;
    }

    const isFirst = customer.address.length === 0;
    const isDefault = addressData.isDefault !== undefined ? !!addressData.isDefault : isFirst;

    const newAddress: any = {
      ...addressData,
      isDefault,
    };

    if (isDefault) {
      customer.address.forEach((addr: any) => {
        addr.isDefault = false;
      });
    }

    customer.address.push(newAddress);
    customer.updatedBy = userId ? new Types.ObjectId(userId) : null;

    const savedCustomer = await customer.save();
    
    // Return the newly added address subdocument (last in array)
    return savedCustomer.address[savedCustomer.address.length - 1] || null;
  }

  /**
   * Update an existing Address
   */
  static async updateAddress(
    customerId: string,
    tenantId: string,
    addrId: string,
    addressData: any,
    userId?: string
  ): Promise<IAddress | null> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!customer) {
      return null;
    }

    const addressSubdoc = (customer.address as any).id(addrId);
    if (!addressSubdoc) {
      return null;
    }

    const isBecomingDefault = addressData.isDefault === true;

    if (isBecomingDefault && !addressSubdoc.isDefault) {
      customer.address.forEach((addr: any) => {
        addr.isDefault = false;
      });
      addressSubdoc.isDefault = true;
    } else if (addressData.isDefault === false && addressSubdoc.isDefault) {
      // If we are explicitly unsetting the default, ensure we don't leave customer without a default address if others exist
      addressSubdoc.isDefault = false;
      const otherAddr = customer.address.find((addr: any) => addr._id.toString() !== addrId);
      if (otherAddr) {
        (otherAddr as any).isDefault = true;
      }
    }

    // Apply other updates
    if (addressData.label !== undefined) addressSubdoc.label = addressData.label;
    if (addressData.line1 !== undefined) addressSubdoc.line1 = addressData.line1;
    if (addressData.line2 !== undefined) addressSubdoc.line2 = addressData.line2;
    if (addressData.city !== undefined) addressSubdoc.city = addressData.city;
    if (addressData.state !== undefined) addressSubdoc.state = addressData.state;
    if (addressData.pincode !== undefined) addressSubdoc.pincode = addressData.pincode;
    if (addressData.location !== undefined) addressSubdoc.location = addressData.location;

    customer.updatedBy = userId ? new Types.ObjectId(userId) : null;

    const savedCustomer = await customer.save();
    return (savedCustomer.address as any).id(addrId) || null;
  }

  /**
   * Delete an Address from Customer (supports auto-promoting fallback default address)
   */
  static async deleteAddress(
    customerId: string,
    tenantId: string,
    addrId: string,
    userId?: string
  ): Promise<boolean> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!customer) {
      return false;
    }

    const addressSubdoc = (customer.address as any).id(addrId);
    if (!addressSubdoc) {
      return false;
    }

    const wasDefault = addressSubdoc.isDefault;

    // Remove the subdocument from array
    addressSubdoc.deleteOne();

    // Auto-promote a replacement default address if the deleted one was the default
    if (wasDefault && customer.address.length > 0) {
      (customer.address[0] as any).isDefault = true;
    }

    customer.updatedBy = userId ? new Types.ObjectId(userId) : null;
    await customer.save();

    return true;
  }
}
