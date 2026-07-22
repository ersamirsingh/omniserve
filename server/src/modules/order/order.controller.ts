import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { OrderService } from "./order.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { OrderSource, OrderStatus } from "../../models/enums.js";
import { AccessScope } from "../../utils/accessScope.utils.js";
import OrderItem from "../../models/orderItem.model.js";

export class OrderController {

  static async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const {
        outletId,
        customerId,
        source,
        subtotal,
        tax,
        deliveryFee,
        discount,
        totalAmount,
        notes,
        items,
      } = req.body;

      if (!outletId || !customerId || !source || subtotal === undefined || totalAmount === undefined || !items) {
        ApiResponseHandler.badRequest(res, 'outletId, customerId, source, subtotal, totalAmount, and items are required');
        return;
      }

      if (!Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId format');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
        ApiResponseHandler.forbidden(res, 'You cannot place orders for this outlet');
        return;
      }
      if (!Types.ObjectId.isValid(customerId)) {
        ApiResponseHandler.badRequest(res, 'Invalid customerId format');
        return;
      }

      if (!Object.values(OrderSource).includes(source)) {
        ApiResponseHandler.badRequest(res, `Invalid order source. Must be one of: ${Object.values(OrderSource).join(', ')}`);
        return;
      }

      if (isNaN(Number(subtotal)) || Number(subtotal) < 0) {
        ApiResponseHandler.badRequest(res, 'subtotal must be a non-negative number');
        return;
      }
      if (isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
        ApiResponseHandler.badRequest(res, 'totalAmount must be a non-negative number');
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        ApiResponseHandler.badRequest(res, 'items must be a non-empty array');
        return;
      }

      for (const item of items) {
        if (!item.menuItemId || !item.name || item.quantity === undefined || item.unitPrice === undefined) {
          ApiResponseHandler.badRequest(res, 'Each order item must contain menuItemId, name, quantity, and unitPrice');
          return;
        }
        if (!Types.ObjectId.isValid(item.menuItemId)) {
          ApiResponseHandler.badRequest(res, `Invalid menuItemId format for item ${item.name}`);
          return;
        }
        if (item.variantId && !Types.ObjectId.isValid(item.variantId)) {
          ApiResponseHandler.badRequest(res, `Invalid variantId format for item ${item.name}`);
          return;
        }
        if (isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
          ApiResponseHandler.badRequest(res, `Quantity must be at least 1 for item ${item.name}`);
          return;
        }
        if (isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
          ApiResponseHandler.badRequest(res, `UnitPrice cannot be negative for item ${item.name}`);
          return;
        }
      }

      const orderData = {
        outletId,
        customerId,
        source,
        subtotal: Number(subtotal),
        tax: tax !== undefined ? Number(tax) : 0,
        deliveryFee: deliveryFee !== undefined ? Number(deliveryFee) : 0,
        discount: discount !== undefined ? Number(discount) : 0,
        totalAmount: Number(totalAmount),
        notes: notes ? String(notes).substring(0, 500) : undefined,
        items,
      };

      const order = await OrderService.placeOrder(req.user.tenantId, orderData, req.user.userId);

      ApiResponseHandler.success(res, 201, 'Order placed successfully', {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to place order');
    }
  }

  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      let outletId = req.query.outletId as string | undefined;
      const orderStatus = req.query.orderStatus as string | undefined;
      const date = req.query.date as string | undefined;
      const operationalMode = req.query.operationalMode as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId query format');
        return;
      }
      if (outletId && !(await AccessScope.canAccessOutlet(req.user, outletId))) {
        ApiResponseHandler.forbidden(res, 'You cannot access orders for this outlet');
        return;
      }

      if (date && isNaN(Date.parse(date))) {
        ApiResponseHandler.badRequest(res, 'Invalid date query parameter format (use YYYY-MM-DD)');
        return;
      }

      const filters: { outletId?: string; orderStatus?: string; date?: string; limit: number; skip: number; operationalMode?: string } = { limit, skip };
      const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
      if (!outletId && allowedOutletIds && allowedOutletIds.length === 1) {
        outletId = allowedOutletIds[0];
      }
      if (outletId) filters.outletId = outletId;
      if (orderStatus) filters.orderStatus = orderStatus;
      if (date) filters.date = date;
      if (operationalMode) filters.operationalMode = operationalMode;

      const { orders, total } = await OrderService.getOrders(req.user.tenantId, filters);
      const scopedOrders = allowedOutletIds === null || outletId
        ? orders
        : orders.filter(order => {
            const oid = (order.outletId as any)?._id?.toString() || order.outletId.toString();
            return allowedOutletIds.includes(oid);
          });

      const orderIds = scopedOrders.map(o => o._id);
      const allOrderItems = await OrderItem.find({ orderId: { $in: orderIds }, isDeleted: false });

      const itemsMap = new Map<string, any[]>();
      allOrderItems.forEach(item => {
        const oid = item.orderId.toString();
        if (!itemsMap.has(oid)) {
          itemsMap.set(oid, []);
        }
        itemsMap.get(oid)!.push({
          id: item._id,
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          addons: item.addons,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        });
      });

      ApiResponseHandler.success(res, 200, 'Orders retrieved successfully', {
        orders: scopedOrders.map(o => ({
          id: o._id,
          orderNumber: o.orderNumber,
          outletId: o.outletId,
          customerId: o.customerId && typeof o.customerId === 'object' ? {
            id: (o.customerId as any)._id || (o.customerId as any).id,
            firstName: (o.customerId as any).firstName,
            lastName: (o.customerId as any).lastName,
            phone: (o.customerId as any).phone,
            email: (o.customerId as any).email,
          } : o.customerId,
          source: o.source,
          subtotal: o.subtotal,
          tax: o.tax,
          deliveryFee: o.deliveryFee,
          discount: o.discount,
          totalAmount: o.totalAmount,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
          diningContext: o.diningContext,
          items: itemsMap.get(o._id.toString()) || [],
        })),
        pagination: {
          total: scopedOrders.length,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list orders');
    }
  }

  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot access this order');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Order details retrieved', {
        id: details.order._id,
        orderNumber: details.order.orderNumber,
        outletId: details.order.outletId,
        customerId: details.order.customerId && typeof details.order.customerId === 'object' ? {
          id: (details.order.customerId as any)._id || (details.order.customerId as any).id,
          firstName: (details.order.customerId as any).firstName,
          lastName: (details.order.customerId as any).lastName,
          phone: (details.order.customerId as any).phone,
          email: (details.order.customerId as any).email,
        } : details.order.customerId,
        source: details.order.source,
        subtotal: details.order.subtotal,
        tax: details.order.tax,
        deliveryFee: details.order.deliveryFee,
        discount: details.order.discount,
        totalAmount: details.order.totalAmount,
        orderStatus: details.order.orderStatus,
        paymentStatus: details.order.paymentStatus,
        notes: details.order.notes,
        acceptedAt: details.order.acceptedAt,
        preparedAt: details.order.preparedAt,
        readyAt: details.order.readyAt,
        pickedUpAt: details.order.pickedUpAt,
        deliveredAt: details.order.deliveredAt,
        cancelledAt: details.order.cancelledAt,
        cancellationReason: details.order.cancellationReason,
        createdAt: details.order.createdAt,
        updatedAt: details.order.updatedAt,
        items: details.items.map(item => ({
          id: item._id,
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          addons: item.addons,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        })),
        payment: details.payment ? {
          id: details.payment._id,
          transactionId: details.payment.transactionId,
          paymentMethod: details.payment.paymentMethod,
          amount: details.payment.amount,
          currency: details.payment.currency,
          status: details.payment.status,
          createdAt: details.payment.createdAt,
        } : null,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve order');
    }
  }

  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const { orderStatus } = req.body;
      if (!orderStatus) {
        ApiResponseHandler.badRequest(res, 'orderStatus is required');
        return;
      }

      if (!Object.values(OrderStatus).includes(orderStatus)) {
        ApiResponseHandler.badRequest(res, `Invalid order status. Must be one of: ${Object.values(OrderStatus).join(', ')}`);
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this order');
        return;
      }

      const order = await OrderService.updateOrderStatus(
        id,
        req.user.tenantId,
        orderStatus as OrderStatus,
        req.user.userId
      );

      if (!order) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }

      const responseData: any = {
        id: order._id,
        orderStatus: order.orderStatus,
      };

      if (orderStatus === OrderStatus.ACCEPTED) responseData.acceptedAt = order.acceptedAt;
      if (orderStatus === OrderStatus.PREPARING) responseData.preparedAt = order.preparedAt;
      if (orderStatus === OrderStatus.READY) responseData.readyAt = order.readyAt;
      if (orderStatus === OrderStatus.PICKED_UP) responseData.pickedUpAt = order.pickedUpAt;
      if (orderStatus === OrderStatus.DELIVERED) responseData.deliveredAt = order.deliveredAt;

      ApiResponseHandler.success(res, 200, `Order status advanced to ${orderStatus}`, responseData);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update order status');
    }
  }

  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const { cancellationReason } = req.body;
      if (!cancellationReason || typeof cancellationReason !== 'string' || cancellationReason.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'cancellationReason must be a non-empty string');
        return;
      }
      if (cancellationReason.length > 255) {
        ApiResponseHandler.badRequest(res, 'cancellationReason cannot exceed 255 characters');
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot cancel this order');
        return;
      }

      const order = await OrderService.cancelOrder(
        id,
        req.user.tenantId,
        cancellationReason.trim(),
        req.user.userId
      );

      if (!order) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Order cancelled successfully', {
        id: order._id,
        orderStatus: order.orderStatus,
        cancelledAt: order.cancelledAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to cancel order');
    }
  }

  static async listOrderItems(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot access this order');
        return;
      }

      const items = await OrderService.getOrderItems(id, req.user.tenantId);

      ApiResponseHandler.success(res, 200, 'Order items retrieved successfully', {
        items: items.map(item => ({
          id: item._id,
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          addons: item.addons,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        })),
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list order items');
    }
  }

  static async addItemToOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const { menuItemId, variantId, addons, quantity, unitPrice, name, notes } = req.body;

      if (!menuItemId || !name || quantity === undefined || unitPrice === undefined) {
        ApiResponseHandler.badRequest(res, 'menuItemId, name, quantity, and unitPrice are required');
        return;
      }

      if (!Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId format');
        return;
      }

      if (variantId && !Types.ObjectId.isValid(variantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid variantId format');
        return;
      }

      if (isNaN(Number(quantity)) || Number(quantity) < 1) {
        ApiResponseHandler.badRequest(res, 'Quantity must be at least 1');
        return;
      }

      if (isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
        ApiResponseHandler.badRequest(res, 'UnitPrice cannot be negative');
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this order');
        return;
      }

      const itemData = {
        menuItemId,
        variantId,
        addons,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        name: name.trim(),
        notes: notes ? String(notes).substring(0, 255) : undefined,
      };

      const orderItem = await OrderService.addItemToOrder(
        id,
        req.user.tenantId,
        itemData,
        req.user.userId
      );

      if (!orderItem) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }

      ApiResponseHandler.success(res, 201, 'Item added to order successfully', {
        id: orderItem._id,
        menuItemId: orderItem.menuItemId,
        variantId: orderItem.variantId,
        addons: orderItem.addons,
        name: orderItem.name,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to add item to order');
    }
  }

  static async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const details = await OrderService.getOrderWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }
      const outletIdStr = (details.order.outletId as any)?._id?.toString() || (details.order.outletId as any)?.toString();
      if (!(await AccessScope.canAccessOutlet(req.user, outletIdStr))) {
        ApiResponseHandler.forbidden(res, 'You cannot delete this order');
        return;
      }

      const order = await OrderService.deleteOrder(id, req.user.tenantId, req.user.userId);
      if (!order) {
        ApiResponseHandler.notFound(res, 'Order not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Order deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete order');
    }
  }
}
