import mongoose, { Types } from 'mongoose';
import Order, { IOrder } from '../models/order.model.js';
import OrderItem, { IOrderItem } from '../models/orderitems.model.js';
import Customer from '../models/customer.model.js';
import Outlet from '../models/outlet.model.js';
import MenuItem from '../models/menuitems.model.js';
import Variant from '../models/variant.model.js';
import Addon from '../models/addon.model.js';
import Inventory from '../models/inventory.model.js';
import Payment from '../models/payment.model.js';
import { OrderStatus, PaymentStatus } from '../enums/enums.js';

export class OrderService {
  /**
   * Helper to validate customer, outlet, and items ownership
   */
  private static async validateOrderHierarchy(
    tenantId: string,
    outletId: string,
    customerId: string,
    items: any[]
  ): Promise<void> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const outletObjectId = new Types.ObjectId(outletId);
    const customerObjectId = new Types.ObjectId(customerId);

    // Validate Customer
    const customer = await Customer.findOne({
      _id: customerObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });
    if (!customer) {
      throw new Error('Customer not found or does not belong to this tenant');
    }

    // Validate Outlet
    const outlet = await Outlet.findOne({
      _id: outletObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });
    if (!outlet) {
      throw new Error('Outlet not found or does not belong to this tenant');
    }

    // Validate each Item
    for (const item of items) {
      const menuItem = await MenuItem.findOne({
        _id: new Types.ObjectId(item.menuItemId),
        tenantId: tenantObjectId,
        outletId: outletObjectId,
        isDeleted: false,
      });
      if (!menuItem) {
        throw new Error(`MenuItem ${item.name} not found, is inactive, or does not belong to the outlet`);
      }

      if (item.variantId) {
        const variant = await Variant.findOne({
          _id: new Types.ObjectId(item.variantId),
          menuItemId: menuItem._id,
          tenantId: tenantObjectId,
          isDeleted: false,
        });
        if (!variant) {
          throw new Error(`Variant not found for MenuItem ${item.name}`);
        }
      }

      if (item.addons && item.addons.length > 0) {
        for (const ad of item.addons) {
          const addon = await Addon.findOne({
            _id: new Types.ObjectId(ad.addonId),
            menuItemId: menuItem._id,
            tenantId: tenantObjectId,
            isDeleted: false,
          });
          if (!addon) {
            throw new Error(`Addon ${ad.name} not found for MenuItem ${item.name}`);
          }
        }
      }
    }
  }

  /**
   * Place a new order with order items
   */
  static async placeOrder(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IOrder> {
    const {
      outletId,
      customerId,
      source,
      subtotal,
      tax = 0,
      deliveryFee = 0,
      discount = 0,
      totalAmount,
      notes,
      items,
    } = data;

    // 1. Math validation: subtotal + tax + deliveryFee - discount === totalAmount
    const calculatedTotal = Number(subtotal) + Number(tax) + Number(deliveryFee) - Number(discount);
    if (Math.abs(calculatedTotal - Number(totalAmount)) > 0.01) {
      throw new Error(`Total amount discrepancy: calculated ${calculatedTotal}, got ${totalAmount}`);
    }

    // 2. Validate hierarchy
    await this.validateOrderHierarchy(tenantId, outletId, customerId, items);

    // 3. Save order using transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = new Order({
        tenantId: new Types.ObjectId(tenantId),
        outletId: new Types.ObjectId(outletId),
        customerId: new Types.ObjectId(customerId),
        source,
        subtotal,
        tax,
        deliveryFee,
        discount,
        totalAmount,
        notes,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      });

      const savedOrder = await order.save({ session });

      // Save OrderItems
      for (const item of items) {
        const orderItem = new OrderItem({
          orderId: savedOrder._id,
          tenantId: new Types.ObjectId(tenantId),
          menuItemId: new Types.ObjectId(item.menuItemId),
          variantId: item.variantId ? new Types.ObjectId(item.variantId) : null,
          addons: item.addons ? item.addons.map((a: any) => ({
            addonId: new Types.ObjectId(a.addonId),
            name: a.name,
            price: a.price,
          })) : [],
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          notes: item.notes,
          createdBy: userId ? new Types.ObjectId(userId) : null,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        });

        await orderItem.save({ session });
      }

      await session.commitTransaction();
      return savedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * List orders with optional filters (outlet / status / date)
   */
  static async getOrders(
    tenantId: string,
    filters: { outletId?: string; orderStatus?: string; date?: string; limit: number; skip: number }
  ): Promise<{ orders: IOrder[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    }

    if (filters.orderStatus) {
      query.orderStatus = filters.orderStatus;
    }

    if (filters.date) {
      // Filter by YYYY-MM-DD
      const startOfDay = new Date(filters.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'firstName lastName phone email')
        .populate('outletId', 'name')
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Order.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * Get complete order with items and payment details
   */
  static async getOrderWithDetails(
    id: string,
    tenantId: string
  ): Promise<{ order: IOrder; items: IOrderItem[]; payment: any | null } | null> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('customerId', 'firstName lastName phone email')
      .populate('outletId', 'name');

    if (!order) {
      return null;
    }

    const [items, payment] = await Promise.all([
      OrderItem.find({
        orderId: order._id,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
      Payment.findOne({
        orderId: order._id,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
    ]);

    return {
      order,
      items,
      payment,
    };
  }

  /**
   * Advance order status with strict workflow rules, inventory checks, and customer LTV syncs.
   */
  static async updateOrderStatus(
    id: string,
    tenantId: string,
    newStatus: OrderStatus,
    userId?: string
  ): Promise<IOrder | null> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!order) {
      return null;
    }

    const currentStatus = order.orderStatus;

    // Workflow transition rules
    const validTransitions: Record<string, string> = {
      [OrderStatus.PENDING]: OrderStatus.ACCEPTED,
      [OrderStatus.ACCEPTED]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.READY,
      [OrderStatus.READY]: OrderStatus.PICKED_UP,
      [OrderStatus.PICKED_UP]: OrderStatus.DELIVERED,
    };

    if (validTransitions[currentStatus] !== newStatus) {
      throw new Error(`Invalid status transition: cannot change status from ${currentStatus} to ${newStatus}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updateFields: any = {
        orderStatus: newStatus,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      };

      // Set timestamps based on transitions
      if (newStatus === OrderStatus.ACCEPTED) {
        updateFields.acceptedAt = new Date();

        // INVENTORY DEDUCTION logic
        // 1. Fetch all items in the order
        const items = await OrderItem.find({ orderId: order._id, isDeleted: false }).session(session);

        // 2. Pre-validate stock for all items
        const stockUpdates: Array<{ inventory: any; newQty: number; isLowStock: boolean }> = [];
        for (const item of items) {
          const inventory = await Inventory.findOne({
            menuItemId: item.menuItemId,
            outletId: order.outletId,
            tenantId: order.tenantId,
            isDeleted: false,
          }).session(session);

          if (!inventory || inventory.quantity < item.quantity) {
            throw new Error(`Insufficient inventory for item: ${item.name}. Available: ${inventory ? inventory.quantity : 0}, Requested: ${item.quantity}`);
          }

          const newQty = inventory.quantity - item.quantity;
          const isLowStock = newQty <= inventory.threshold;
          stockUpdates.push({ inventory, newQty, isLowStock });
        }

        // 3. Deduct stock for all items
        for (const update of stockUpdates) {
          await Inventory.updateOne(
            { _id: update.inventory._id },
            {
              quantity: update.newQty,
              isLowStock: update.isLowStock,
              updatedBy: userId ? new Types.ObjectId(userId) : null,
            },
            { session }
          );
        }
      } else if (newStatus === OrderStatus.PREPARING) {
        updateFields.preparedAt = new Date();
      } else if (newStatus === OrderStatus.READY) {
        updateFields.readyAt = new Date();
      } else if (newStatus === OrderStatus.PICKED_UP) {
        updateFields.pickedUpAt = new Date();
      } else if (newStatus === OrderStatus.DELIVERED) {
        updateFields.deliveredAt = new Date();

        // CUSTOMER STATISTICS updates (prevent double counting)
        if (currentStatus !== OrderStatus.DELIVERED) {
          await Customer.updateOne(
            { _id: order.customerId, tenantId: order.tenantId },
            { $inc: { totalOrders: 1, totalSpent: order.totalAmount } },
            { session }
          );
        }
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, tenantId: order.tenantId },
        updateFields,
        { new: true, session }
      );

      await session.commitTransaction();
      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel an order with a reason (only allowed from PENDING or ACCEPTED)
   */
  static async cancelOrder(
    id: string,
    tenantId: string,
    cancellationReason: string,
    userId?: string
  ): Promise<IOrder | null> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!order) {
      return null;
    }

    const currentStatus = order.orderStatus;

    if (currentStatus !== OrderStatus.PENDING && currentStatus !== OrderStatus.ACCEPTED) {
      throw new Error(`Cannot cancel order in status ${currentStatus}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // INVENTORY RESTORATION: only if it had previously reached ACCEPTED
      if (currentStatus === OrderStatus.ACCEPTED) {
        const items = await OrderItem.find({ orderId: order._id, isDeleted: false }).session(session);

        for (const item of items) {
          const inventory = await Inventory.findOne({
            menuItemId: item.menuItemId,
            outletId: order.outletId,
            tenantId: order.tenantId,
            isDeleted: false,
          }).session(session);

          if (inventory) {
            const newQty = inventory.quantity + item.quantity;
            const isLowStock = newQty <= inventory.threshold;

            await Inventory.updateOne(
              { _id: inventory._id },
              {
                quantity: newQty,
                isLowStock,
                updatedBy: userId ? new Types.ObjectId(userId) : null,
              },
              { session }
            );
          }
        }
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, tenantId: order.tenantId },
        {
          orderStatus: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { new: true, session }
      );

      await session.commitTransaction();
      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * List items for an order
   */
  static async getOrderItems(orderId: string, tenantId: string): Promise<IOrderItem[]> {
    return await OrderItem.find({
      orderId: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Add item to an existing order (allowed pre-ACCEPTED only, i.e., status = PENDING)
   */
  static async addItemToOrder(
    orderId: string,
    tenantId: string,
    itemData: any,
    userId?: string
  ): Promise<IOrderItem | null> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!order) {
      return null;
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw new Error(`Cannot add item to order in status ${order.orderStatus}. Items can only be added to PENDING orders.`);
    }

    // Validate item hierarchy under outlet and tenant
    await this.validateOrderHierarchy(tenantId, order.outletId.toString(), order.customerId.toString(), [itemData]);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const orderItem = new OrderItem({
        orderId: order._id,
        tenantId: new Types.ObjectId(tenantId),
        menuItemId: new Types.ObjectId(itemData.menuItemId),
        variantId: itemData.variantId ? new Types.ObjectId(itemData.variantId) : null,
        addons: itemData.addons ? itemData.addons.map((a: any) => ({
          addonId: new Types.ObjectId(a.addonId),
          name: a.name,
          price: a.price,
        })) : [],
        name: itemData.name,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        totalPrice: itemData.quantity * itemData.unitPrice,
        notes: itemData.notes,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      });

      const savedItem = await orderItem.save({ session });

      // Recalculate order subtotal and totalAmount
      const items = await OrderItem.find({ orderId: order._id, isDeleted: false }).session(session);
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalAmount = subtotal + order.tax + order.deliveryFee - order.discount;

      await Order.updateOne(
        { _id: order._id },
        { subtotal, totalAmount, updatedBy: userId ? new Types.ObjectId(userId) : null },
        { session }
      );

      await session.commitTransaction();
      return savedItem;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Soft-delete an order and its items
   */
  static async deleteOrder(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IOrder | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        {
          isDeleted: true,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { new: true, session }
      );

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return null;
      }

      await OrderItem.updateMany(
        { orderId: order._id, tenantId: new Types.ObjectId(tenantId) },
        { isDeleted: true, updatedBy: userId ? new Types.ObjectId(userId) : null },
        { session }
      );

      await session.commitTransaction();
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
