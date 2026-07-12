import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Outlet from "../../models/outlet.model.js";
import Table from "../../models/table.model.js";
import DiningArea from "../../models/diningarea.model.js";
import QRSession from "../../models/qrsession.model.js";
import OrderGroup from "../../models/ordergroup.model.js";
import BillSession from "../../models/billsession.model.js";
import Category from "../../models/category.model.js";
import MenuItem from "../../models/menuItem.model.js";
import Variant from "../../models/variant.model.js";
import Addon from "../../models/addon.model.js";
import Inventory from "../../models/inventory.model.js";
import Cart from "../../models/cart.model.js";
import CheckoutSession from "../../models/checkoutsession.model.js";
import ChannelSession from "../../models/channelsession.model.js";
import CustomerAddress from "../../models/customeraddress.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import Order from "../../models/order.model.js";
import OrderItem from "../../models/orderItem.model.js";
import Customer from "../../models/customer.model.js";
import { NotificationService } from "../notification/notification.service.js";
import { OrderGatewayService } from "../order/ordergateway.service.js";
import { EventBusService } from "../../events/eventBus.js";
import { IntegrationProvider } from "../../types/integration.type.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { RealtimeService } from "../../sockets/realtime.service.js";
import { BillingService } from "../order/billing.service.js";
import { WaiterTaskService } from "../order/waiter-task.service.js";
import { OrderService } from "../order/order.service.js";
import Payment from "../../models/payment.model.js";
import WaiterTask from "../../models/waitertask.model.js";
import { PaymentMethod, PaymentStatus, OrderStatus } from "../../models/enums.js";
import { CouponService } from "../coupon/coupon.service.js";
import GuestSession from "../../models/guestsession.model.js";
import Coupon from "../../models/coupon.model.js";
import IdempotencyKey from "../../models/idempotencyKey.model.js";

class Idempotency {
  static async check(key: string, tenantId: string | Types.ObjectId): Promise<{ statusCode: number; body: any } | null> {
    if (!key) return null;
    const record = await (IdempotencyKey as any).findOne({ key, tenantId: new Types.ObjectId(tenantId) });
    if (record) {
      return { statusCode: record.statusCode, body: record.responseBody };
    }
    return null;
  }

  static async save(key: string, tenantId: string | Types.ObjectId, statusCode: number, responseBody: any): Promise<void> {
    if (!key) return;
    await (IdempotencyKey as any).create({
      key,
      tenantId: new Types.ObjectId(tenantId),
      statusCode,
      responseBody
    });
  }
}

export class PublicController {
  /**
   * GET /api/public/o/:outletSlug/menu
   * Retrieves categories, items, variants, and addons for a slug
   */
  static async getPublicMenu(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug } = req.params;
      const trackInventory = req.query.trackInventory !== "false";

      // 1. Find Outlet
      const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }

      // 2. Fetch active Categories
      const categories = await Category.find({
        outletId: outlet._id,
        isActive: true,
        isDeleted: false,
      }).sort({ displayOrder: 1 });

      const categoryIds = categories.map((c) => c._id);

      // 3. Fetch active Menu Items
      const rawMenuItems = await MenuItem.find({
        outletId: outlet._id,
        categoryId: { $in: categoryIds },
        isAvailable: true,
        isDeleted: false,
      }).sort({ displayOrder: 1 });

      // 4. Filter by Inventory if enabled
      let menuItems = rawMenuItems;
      if (trackInventory) {
        const inventories = await Inventory.find({
          outletId: outlet._id,
          isDeleted: false,
        });

        const inventoryMap = new Map<string, number>();
        inventories.forEach((inv) => {
          inventoryMap.set(inv.menuItemId.toString(), inv.quantity);
        });

        // Keep items if they either have no inventory record, or have quantity > 0
        menuItems = rawMenuItems.filter((item) => {
          const qty = inventoryMap.get((item._id as Types.ObjectId).toString());
          return qty === undefined || qty > 0;
        });
      }

      const menuItemIds = menuItems.map((item) => item._id);

      // 5. Fetch active Variants and Addons
      const [variants, addons] = await Promise.all([
        Variant.find({
          menuItemId: { $in: menuItemIds },
          isAvailable: true,
          isDeleted: false,
        }),
        Addon.find({
          menuItemId: { $in: menuItemIds },
          isAvailable: true,
          isDeleted: false,
        }),
      ]);

      ApiResponseHandler.success(res, 200, "Public menu retrieved successfully", {
        outlet: {
          id: outlet._id,
          name: outlet.name,
          slug: outlet.slug,
          address: outlet.address,
        },
        categories,
        menuItems,
        variants,
        addons,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve public menu");
    }
  }

  /**
   * GET /api/public/o/:outletSlug/t/:tableToken/menu
   * Retrieves public menu alongside table info, dining area details, and manages QRSession funnel
   */
  static async getTableSpecificMenu(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug, tableToken } = req.params;

      // 1. Find Table by token
      const table = await Table.findOne({ qrToken: tableToken, isDeleted: false });
      if (!table || table.status !== "ACTIVE") {
        ApiResponseHandler.notFound(res, "Table not found or is currently inactive");
        return;
      }

      if (table.operationalStatus === "RESERVED") {
        ApiResponseHandler.badRequest(res, "This table has already been reserved. Please contact staff.");
        return;
      }

      if (table.operationalStatus === "CLEANING") {
        ApiResponseHandler.badRequest(res, "Table is currently being cleaned. Please wait.");
        return;
      }

      // 2. Find Outlet
      const outlet = await Outlet.findOne({ slug: outletSlug, _id: table.outletId, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }

      // 3. Find Dining Area
      let diningArea = null;
      if (table.diningAreaId) {
        diningArea = await DiningArea.findOne({ _id: table.diningAreaId, isDeleted: false });
      }

      // 4. Resolve or initialize QRSession for scan analytics funnel
      let session = null;
      if (table.activeSessionId) {
        session = await QRSession.findById(table.activeSessionId);
      }

      if (!session || session.status === "CLOSED" || session.status === "EXPIRED") {
        session = await QRSession.create({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          status: "OPEN",
          openedAt: new Date(),
          menuViewedAt: new Date(),
        });
        table.activeSessionId = session._id;
        await table.save();
      } else if (!session.menuViewedAt) {
        session.menuViewedAt = new Date();
        await session.save();
      }

      // 5. Fetch Menu Items using existing getPublicMenu logic
      const categories = await Category.find({
        outletId: outlet._id,
        isActive: true,
        isDeleted: false,
      }).sort({ displayOrder: 1 });

      const categoryIds = categories.map((c) => c._id);

      const rawMenuItems = await MenuItem.find({
        outletId: outlet._id,
        categoryId: { $in: categoryIds },
        isAvailable: true,
        isDeleted: false,
      }).sort({ displayOrder: 1 });

      // Check stock
      const inventories = await Inventory.find({
        outletId: outlet._id,
        isDeleted: false,
      });

      const inventoryMap = new Map<string, number>();
      inventories.forEach((inv) => {
        inventoryMap.set(inv.menuItemId.toString(), inv.quantity);
      });

      const menuItems = rawMenuItems.filter((item) => {
        const qty = inventoryMap.get((item._id as Types.ObjectId).toString());
        return qty === undefined || qty > 0;
      });

      const menuItemIds = menuItems.map((item) => item._id);

      const [variants, addons] = await Promise.all([
        Variant.find({
          menuItemId: { $in: menuItemIds },
          isAvailable: true,
          isDeleted: false,
        }),
        Addon.find({
          menuItemId: { $in: menuItemIds },
          isAvailable: true,
          isDeleted: false,
        }),
      ]);

      ApiResponseHandler.success(res, 200, "Table specific menu retrieved successfully", {
        outlet: {
          id: outlet._id,
          name: outlet.name,
          slug: outlet.slug,
        },
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          seatCount: table.seatCount,
          metadata: table.metadata,
        },
        diningArea,
        session: {
          sessionToken: session.sessionToken,
          status: session.status,
          openedAt: session.openedAt,
        },
        categories,
        menuItems,
        variants,
        addons,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve table menu");
    }
  }

  /**
   * POST /api/public/qr/orders
   * Places an order for a scanned table session
   */
  static async placeQrOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tableToken, seatNumber, customer, items, notes } = req.body;

      if (!tableToken) {
        ApiResponseHandler.badRequest(res, "Missing tableToken in order body");
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        ApiResponseHandler.badRequest(res, "Order must contain at least one item");
        return;
      }

      // 1. Find Table
      const table = await Table.findOne({ qrToken: tableToken, isDeleted: false });
      if (!table || table.status !== "ACTIVE") {
        ApiResponseHandler.badRequest(res, "Invalid or inactive Table Token");
        return;
      }

      // Idempotency Key check
      const idempotencyKey = req.headers["idempotency-key"] as string;
      if (idempotencyKey) {
        const cached = await Idempotency.check(idempotencyKey, table.tenantId);
        if (cached) {
          res.status(cached.statusCode).json(cached.body);
          return;
        }
      }

      // Price Validation
      const priceChanges = [];
      const acceptPriceChanges = !!req.body.acceptPriceChanges;
      for (const item of items) {
        const menuItemId = item.menuItemId || item.itemId;
        const dbItem = await MenuItem.findById(menuItemId);
        if (!dbItem) continue;

        let expectedPrice = dbItem.price;
        if (item.variantId) {
          const dbVariant = await Variant.findById(item.variantId);
          if (dbVariant) expectedPrice = dbVariant.price;
        }

        const clientPrice = Number(item.price || 0);
        if (clientPrice !== expectedPrice) {
          priceChanges.push({
            itemId: menuItemId.toString(),
            name: dbItem.name,
            oldPrice: clientPrice,
            newPrice: expectedPrice
          });
        }
      }

      if (priceChanges.length > 0 && !acceptPriceChanges) {
        const responseBody = {
          success: false,
          statusCode: 400,
          message: "Price has changed",
          data: {
            status: "PRICE_CHANGED",
            message: "Some item prices have changed. Please review your cart.",
            changes: priceChanges
          }
        };
        if (idempotencyKey) {
          await Idempotency.save(idempotencyKey, table.tenantId, 400, responseBody);
        }
        res.status(400).json(responseBody);
        return;
      }

      // Inventory Stock Validation
      const unavailableItems = [];
      for (const item of items) {
        const menuItemId = item.menuItemId || item.itemId;
        const inventory = await Inventory.findOne({
          menuItemId,
          outletId: table.outletId,
          tenantId: table.tenantId,
          isDeleted: false
        });

        if (inventory && inventory.quantity < item.quantity) {
          unavailableItems.push({
            itemId: menuItemId.toString(),
            name: item.name,
            requestedQty: item.quantity,
            availableQty: inventory.quantity
          });
        }
      }

      if (unavailableItems.length > 0) {
        const responseBody = {
          success: false,
          statusCode: 400,
          message: "Stock unavailable",
          data: {
            status: "STOCK_UNAVAILABLE",
            message: "Some items in your cart are no longer available in the requested quantity.",
            unavailableItems
          }
        };
        if (idempotencyKey) {
          await Idempotency.save(idempotencyKey, table.tenantId, 400, responseBody);
        }
        res.status(400).json(responseBody);
        return;
      }

      // 2. Resolve or create active OPEN QRSession
      let session = null;
      if (table.activeSessionId) {
        session = await QRSession.findById(table.activeSessionId);
      }

      if (!session || session.status === "CLOSED" || session.status === "EXPIRED") {
        session = await QRSession.create({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          status: "OPEN",
          openedAt: new Date(),
          firstItemAddedAt: new Date(),
          checkoutStartedAt: new Date(),
          orderPlacedAt: new Date(),
        });
        table.activeSessionId = session._id;
        await table.save();
      } else {
        session.orderPlacedAt = new Date();
        if (!session.firstItemAddedAt) session.firstItemAddedAt = new Date();
        if (!session.checkoutStartedAt) session.checkoutStartedAt = new Date();
        await session.save();
      }

      // 3. Compute totals from items payload
      let subtotal = 0;
      const formattedItems = items.map((item: any) => {
        const itemPrice = Number(item.price || 0);
        let itemTotal = itemPrice;

        const addons = (item.addons || []).map((a: any) => {
          const addonPrice = Number(a.price || 0);
          itemTotal += addonPrice;
          return {
            addonId: a.addonId,
            name: a.name,
            price: addonPrice,
          };
        });

        subtotal += itemTotal * Number(item.quantity || 1);

        return {
          menuItemId: item.menuItemId || item.itemId,
          variantId: item.variantId || undefined,
          name: item.name || "Item",
          quantity: Number(item.quantity || 1),
          unitPrice: itemPrice,
          price: itemPrice,
          addons,
        };
      });

      const totalAmount = subtotal;

      // 4. Construct raw canonical payload matching QrAdapter expectation
      const rawPayload = {
        orderId: `QR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        outletId: table.outletId.toString(),
        customer: {
          name: customer?.name || "Guest Customer",
          phone: customer?.phone || "0000000000",
        },
        fulfillment: {
          tableNumber: table.tableNumber,
          tableId: table._id.toString(),
          seatNumber: seatNumber || undefined,
        },
        pricing: {
          subtotal,
          tax: 0,
          deliveryFee: 0,
          discount: 0,
          totalAmount,
        },
        items: formattedItems,
        notes: notes || undefined,
      };

      // 5. Ingest and process order through canonical pipeline
      const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
        tenantId: table.tenantId.toString(),
        provider: IntegrationProvider.QR,
        externalOrderId: rawPayload.orderId,
        rawPayload,
        outletId: table.outletId.toString(),
      });

      const processedOrder = await OrderGatewayService.processExternalOrder({
        externalOrderId: externalOrder._id.toString(),
        tenantId: table.tenantId.toString(),
      });

      if (processedOrder.status !== "PLACED" || !processedOrder.internalOrderId) {
        ApiResponseHandler.badRequest(res, `Failed to place QR order. Processing status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`);
        return;
      }

      // 6. Resolve Customer and update Session / Order Group / Bill Session hierarchy
      const orderId = processedOrder.internalOrderId;
      const internalCustomerId = (processedOrder.canonicalPayload as any)?.customer ? await QRSession.db.model("Customer").findOne({
        tenantId: table.tenantId,
        phone: rawPayload.customer.phone,
        isDeleted: false,
      }) : null;

      const customerObjectId = internalCustomerId ? internalCustomerId._id : null;

      // Update Session
      session.status = "ORDERED";
      if (customerObjectId) session.customerId = customerObjectId;
      if (seatNumber) session.seatNumber = seatNumber;
      await session.save();

      // Link Internal Order to Session and Waiter
      const internalOrder = await QRSession.db.model("Order").findById(orderId);
      if (internalOrder) {
        internalOrder.sessionId = session._id;
        if (session.waiterId) internalOrder.waiterId = session.waiterId;
        await internalOrder.save();
      }

      // Resolve or create OrderGroup
      let group = await OrderGroup.findOne({
        sessionId: session._id,
        isDeleted: false,
      });

      if (!group) {
        group = new OrderGroup({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          sessionId: session._id,
          customerIds: customerObjectId ? [customerObjectId] : [],
          orderIds: [orderId],
        });
      } else {
        if (customerObjectId && !group.customerIds.map(id => id.toString()).includes(customerObjectId.toString())) {
          group.customerIds.push(customerObjectId);
        }
        if (!group.orderIds.map(id => id.toString()).includes(orderId.toString())) {
          group.orderIds.push(orderId);
        }
      }
      await group.save();

      // Resolve or create BillSession
      let bill = await BillSession.findOne({
        sessionId: session._id,
        status: "OPEN",
        isDeleted: false,
      });

      if (!bill) {
        bill = new BillSession({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          sessionId: session._id,
          orderIds: [orderId],
          totalAmount: totalAmount,
          status: "OPEN",
        });
      } else {
        if (!bill.orderIds.map(id => id.toString()).includes(orderId.toString())) {
          bill.orderIds.push(orderId);
          bill.totalAmount += totalAmount;
        }
      }
      await bill.save();

      // Recalculate bill session automatically on order placement
      await BillingService.recalculateBillSession(table.tenantId, session._id);

      const responseBody = {
        success: true,
        statusCode: 201,
        message: "QR Order placed successfully",
        data: processedOrder
      };

      if (idempotencyKey) {
        await Idempotency.save(idempotencyKey, table.tenantId, 201, responseBody);
      }

      res.status(201).json(responseBody);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to place QR order");
    }
  }

  /**
   * POST /api/public/qr/assist
   * Dispatches operational notification alerts for a table via outbox events
   */
  static async requestQrAssistance(req: Request, res: Response): Promise<void> {
    try {
      const { tableToken, action, seatNumber, notes } = req.body;

      if (!tableToken || !action) {
        ApiResponseHandler.badRequest(res, "Missing tableToken or assistance action parameter");
        return;
      }

      // 1. Find Table
      const table = await Table.findOne({ qrToken: tableToken, isDeleted: false });
      if (!table || table.status !== "ACTIVE") {
        ApiResponseHandler.badRequest(res, "Invalid or inactive Table Token");
        return;
      }

      // 2. Resolve active session
      let session = await QRSession.findOne({
        tableId: table._id,
        status: { $in: ["OPEN", "ACTIVE", "ORDERING", "DINING", "PAYMENT_PENDING", "ORDERED"] },
        isDeleted: false
      });

      if (!session) {
        const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        session = new QRSession({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          status: "ACTIVE",
          joinCode,
          openedAt: new Date(),
          seatNumber: seatNumber || null
        });
        await session.save();
        table.operationalStatus = "OCCUPIED";
        await table.save();
        await EventBusService.publishTableOccupied(
          table.tenantId, table.outletId, table._id,
          { tableId: table._id.toString(), tableNumber: table.tableNumber, status: table.operationalStatus, updatedAt: new Date() },
          { correlationId: session.sessionToken }
        );
      }

      // 3. Map guest action string to WaiterTaskType
      const ACTION_MAP: Record<string, import("../../models/waitertask.model.js").WaiterTaskType> = {
        NEED_WATER:   "WATER",
        WATER:        "WATER",
        NEED_SPOON:   "SPOON",
        SPOON:        "SPOON",
        NEED_TISSUE:  "TISSUE",
        TISSUE:       "TISSUE",
        NEED_BILL:    "BILL",
        BILL:         "BILL",
        CALL_WAITER:  "CUSTOM",
        SERVE_FOOD:   "SERVE_FOOD",
        CLEANING_REQUIRED: "CLEANING",
        CLEANING:     "CLEANING",
      };
      const taskType = ACTION_MAP[String(action).toUpperCase()] || "CUSTOM";

      // Waiter Task Duplicate Prevention (with status/age check)
      const existingTask = await WaiterTask.findOne({
        sessionId: session._id,
        taskType,
        status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] },
        createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }, // created within the last 15 minutes
        isDeleted: false
      });

      if (existingTask) {
        ApiResponseHandler.badRequest(res, `${taskType.replace('_', ' ')} already requested. Please wait until your current request is completed.`);
        return;
      }

      // 4. Create WaiterTask document via WaiterTaskService
      const waiterTask = await WaiterTaskService.createTask(
        table.tenantId,
        table.outletId,
        table._id,
        session._id,
        taskType,
        "GUEST_QR",
        {
          seatNumber: seatNumber || undefined,
          priority: taskType === "BILL" ? "HIGH" : "MEDIUM",
          metadata: { originalAction: String(action).toUpperCase(), notes: notes || undefined }
        }
      );

      // 5. Emit socket event to outlet room so Waiter Console updates immediately
      RealtimeService.sendToOutlet(
        table.tenantId.toString(),
        table.outletId.toString(),
        "WAITER_TASK_CREATED" as any,
        {
          taskId:      waiterTask._id.toString(),
          taskType,
          tableId:     table._id.toString(),
          tableNumber: table.tableNumber,
          seatNumber:  seatNumber || null,
          sessionId:   session._id.toString(),
          status:      "CREATED",
          priority:    taskType === "BILL" ? "HIGH" : "MEDIUM",
          createdAt:   waiterTask.createdAt
        }
      );

      ApiResponseHandler.success(res, 200, "Assistance request sent successfully", {
        taskId:      waiterTask._id.toString(),
        tableNumber: table.tableNumber,
        action:      String(action).toUpperCase(),
        taskType,
        seatNumber:  seatNumber || null,
        sessionId:   session._id.toString()
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to request assistance");
    }
  }

  /**
   * GET /api/public/o/:outletSlug/categories
   * Retrieves active categories for an outlet
   */
  static async getPublicCategories(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug } = req.params;
      const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }
      const categories = await Category.find({
        outletId: outlet._id,
        isActive: true,
        isDeleted: false,
      }).sort({ displayOrder: 1 });

      ApiResponseHandler.success(res, 200, "Categories retrieved successfully", categories);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve categories");
    }
  }

  /**
   * GET /api/public/o/:outletSlug/menu/:itemId
   * Retrieves a menu item, its active variants, and active addons
   */
  static async getPublicMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug, itemId } = req.params;
      const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }
      const menuItem = await MenuItem.findOne({
        _id: new Types.ObjectId(itemId as string),
        outletId: outlet._id,
        isAvailable: true,
        isDeleted: false,
      });

      if (!menuItem) {
        ApiResponseHandler.notFound(res, "Menu item not found");
        return;
      }

      const [variants, addons] = await Promise.all([
        Variant.find({ menuItemId: menuItem._id, isAvailable: true, isDeleted: false }),
        Addon.find({ menuItemId: menuItem._id, isAvailable: true, isDeleted: false }),
      ]);

      ApiResponseHandler.success(res, 200, "Menu item details retrieved successfully", {
        menuItem,
        variants,
        addons,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve menu item details");
    }
  }

  /**
   * GET /api/public/cart
   * Retrieves the active cart associated with the guest session token or table session token
   */
  static async getCart(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken = req.headers["x-guest-session-token"] || req.headers["x-session-token"];
      if (!sessionToken) {
        ApiResponseHandler.badRequest(res, "Session token is required");
        return;
      }
      const cart = await Cart.findOne({
        sessionToken: String(sessionToken),
        status: "ACTIVE",
        isDeleted: false,
      });

      if (cart) {
        await cart.populate([
          { path: "items.menuItemId" },
          { path: "items.variantId" },
          { path: "items.addons.addonId" }
        ]);
      }

      ApiResponseHandler.success(res, 200, "Cart retrieved successfully", cart || { items: [] });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve cart");
    }
  }

  /**
   * POST /api/public/cart
   * Creates or updates a cart, enforcing single-outlet cart rules and updating ChannelSession funnel metrics
   */
  static async createOrUpdateCart(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken, outletId, item } = req.body;

      if (!sessionToken || !outletId || !item || !item.menuItemId || !item.quantity) {
        ApiResponseHandler.badRequest(res, "sessionToken, outletId, menuItemId, and quantity are required");
        return;
      }

      // Find target MenuItem to check availability and outlet ownership
      const menuItem = await MenuItem.findOne({
        _id: new Types.ObjectId(item.menuItemId),
        isAvailable: true,
        isDeleted: false,
      });

      if (!menuItem) {
        ApiResponseHandler.badRequest(res, "Menu item is unavailable or does not exist");
        return;
      }

      // Enforce single-outlet cart rules: check if menuItem belongs to outletId
      const belongsToOutlet = menuItem.outletId.toString() === outletId.toString();

      if (!belongsToOutlet) {
        ApiResponseHandler.badRequest(res, "This item does not belong to the selected outlet");
        return;
      }

      // Resolve or initialize ChannelSession for funnel tracking
      let session = await ChannelSession.findOne({
        sessionToken,
        isDeleted: false,
      });

      if (!session) {
        // Parse IP, userAgent, and attribution details from headers/query
        const ipAddress = req.ip || String(req.headers["x-forwarded-for"] || "");
        const userAgent = String(req.headers["user-agent"] || "");
        const referrer = String(req.headers["referer"] || req.headers["referrer"] || "");
        const utmSource = String(req.query.utm_source || req.body.utmSource || "");
        const utmMedium = String(req.query.utm_medium || req.body.utmMedium || "");
        const utmCampaign = String(req.query.utm_campaign || req.body.utmCampaign || "");

        session = await ChannelSession.create({
          tenantId: menuItem.tenantId,
          outletId: new Types.ObjectId(outletId),
          sessionToken,
          channel: "WEBSITE",
          menuViewedAt: new Date(),
          firstItemViewedAt: new Date(),
          firstAddToCartAt: new Date(),
          ipAddress,
          userAgent,
          referrer,
          utmSource,
          utmMedium,
          utmCampaign,
        });
      } else {
        if (!session.firstAddToCartAt) {
          session.firstAddToCartAt = new Date();
          await session.save();
        }
      }

      // Resolve or create Cart
      let cart = await Cart.findOne({
        sessionToken,
        status: "ACTIVE",
        isDeleted: false,
      });

      let isNewCart = false;
      if (!cart) {
        isNewCart = true;
        cart = new Cart({
          tenantId: menuItem.tenantId,
          outletId: new Types.ObjectId(outletId),
          sessionToken,
          items: [],
          status: "ACTIVE",
          lastActivityAt: new Date(),
        });
      } else {
        // Enforce single-outlet cart rules on existing cart
        if (cart.outletId.toString() !== outletId.toString()) {
          ApiResponseHandler.badRequest(res, "Cart already contains items from another outlet. Cross-outlet ordering is rejected.");
          return;
        }
      }

      const activeCart = cart!;

      // Parse item properties
      const menuItemId = new Types.ObjectId(item.menuItemId);
      const variantId = item.variantId ? new Types.ObjectId(item.variantId) : null;
      const addons = (item.addons || []).map((a: any) => ({
        addonId: new Types.ObjectId(a.addonId),
        quantity: Number(a.quantity || 1),
      }));
      const quantity = Number(item.quantity);
      const notes = item.notes || null;

      // Check if item already exists in cart with same variant/addons
      const existingItemIndex = activeCart.items.findIndex((cartItem) => {
        const matchMenuItem = cartItem.menuItemId.toString() === menuItemId.toString();
        const matchVariant = (!cartItem.variantId && !variantId) || 
          (cartItem.variantId?.toString() === variantId?.toString());
        
        if (!matchMenuItem || !matchVariant) return false;
        if (cartItem.addons.length !== addons.length) return false;
        
        return addons.every((newAddon: any) =>
          cartItem.addons.some(
            (existingAddon) =>
              existingAddon.addonId.toString() === newAddon.addonId.toString() &&
              existingAddon.quantity === newAddon.quantity
          )
        );
      });

      if (existingItemIndex > -1) {
        const existingItem = activeCart.items[existingItemIndex];
        if (existingItem) {
          existingItem.quantity += quantity;
          if (notes) existingItem.notes = notes;
        }
      } else {
        activeCart.items.push({
          menuItemId,
          variantId,
          addons,
          quantity,
          notes,
        });
      }

      activeCart.lastActivityAt = new Date();
      await activeCart.save();
      await activeCart.populate([
        { path: "items.menuItemId" },
        { path: "items.variantId" },
        { path: "items.addons.addonId" }
      ]);

      // Publish event
      if (isNewCart) {
        await EventBusService.publishCartCreated(activeCart.tenantId, activeCart.outletId, activeCart._id, activeCart, {
          correlationId: session.sessionToken,
          sourceSystem: "WEBSITE",
        }).catch(err => console.error("Failed to publish CART_CREATED event:", err));
      } else {
        await EventBusService.publishCartUpdated(activeCart.tenantId, activeCart.outletId, activeCart._id, activeCart, {
          correlationId: session.sessionToken,
          sourceSystem: "WEBSITE",
        }).catch(err => console.error("Failed to publish CART_UPDATED event:", err));
      }

      ApiResponseHandler.success(res, 200, "Cart updated successfully", activeCart);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to update cart");
    }
  }

  /**
   * PATCH /api/public/cart/:id
   * Updates quantities or notes of cart items
   */
  static async updateCart(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { item } = req.body;

      if (!item || !item.menuItemId || item.quantity === undefined) {
        ApiResponseHandler.badRequest(res, "menuItemId and quantity are required");
        return;
      }

      const cart = await Cart.findOne({
        _id: new Types.ObjectId(id as string),
        status: "ACTIVE",
        isDeleted: false,
      });

      if (!cart) {
        ApiResponseHandler.notFound(res, "Active cart not found");
        return;
      }

      const menuItemId = item.menuItemId;
      const variantId = item.variantId || null;
      const quantity = Number(item.quantity);

      // Find item index
      const itemIndex = cart.items.findIndex(
        (cartItem) =>
          cartItem.menuItemId.toString() === menuItemId.toString() &&
          ((!cartItem.variantId && !variantId) || cartItem.variantId?.toString() === variantId?.toString())
      );

      if (itemIndex === -1) {
        ApiResponseHandler.notFound(res, "Item not found in cart");
        return;
      }

      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        const cartItem = cart.items[itemIndex];
        if (cartItem) {
          cartItem.quantity = quantity;
          if (item.notes !== undefined) cartItem.notes = item.notes;
        }
      }

      cart.lastActivityAt = new Date();
      await cart.save();
      await cart.populate([
        { path: "items.menuItemId" },
        { path: "items.variantId" },
        { path: "items.addons.addonId" }
      ]);

      await EventBusService.publishCartUpdated(cart.tenantId, cart.outletId, cart._id, cart, {
        correlationId: cart.sessionToken,
        sourceSystem: "WEBSITE",
      }).catch(err => console.error("Failed to publish CART_UPDATED event:", err));

      ApiResponseHandler.success(res, 200, "Cart updated successfully", cart);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to update cart");
    }
  }

  /**
   * DELETE /api/public/cart/:id/items/:itemId
   * Removes item from cart
   */
  static async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;
      const variantId = req.query.variantId || null;

      const cart = await Cart.findOne({
        _id: new Types.ObjectId(id as string),
        status: "ACTIVE",
        isDeleted: false,
      });

      if (!cart) {
        ApiResponseHandler.notFound(res, "Active cart not found");
        return;
      }

      const itemIndex = cart.items.findIndex(
        (cartItem) =>
          cartItem.menuItemId.toString() === (itemId as string) &&
          ((!cartItem.variantId && !variantId) || cartItem.variantId?.toString() === variantId?.toString())
      );

      if (itemIndex === -1) {
        ApiResponseHandler.notFound(res, "Item not found in cart");
        return;
      }

      cart.items.splice(itemIndex, 1);
      cart.lastActivityAt = new Date();
      await cart.save();
      await cart.populate([
        { path: "items.menuItemId" },
        { path: "items.variantId" },
        { path: "items.addons.addonId" }
      ]);

      await EventBusService.publishCartUpdated(cart.tenantId, cart.outletId, cart._id, cart, {
        correlationId: cart.sessionToken,
        sourceSystem: "WEBSITE",
      }).catch(err => console.error("Failed to publish CART_UPDATED event:", err));

      ApiResponseHandler.success(res, 200, "Item removed from cart successfully", cart);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to remove item from cart");
    }
  }

  /**
   * POST /api/public/customer/address
   * Creates a customer address standalone record
   */
  static async createCustomerAddress(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, customerId, label, line1, line2, city, state, pincode, location, isDefault } = req.body;

      if (!tenantId || !customerId || !line1 || !city || !state || !pincode) {
        ApiResponseHandler.badRequest(res, "tenantId, customerId, line1, city, state, and pincode are required");
        return;
      }

      const address = new CustomerAddress({
        tenantId: new Types.ObjectId(tenantId),
        customerId: new Types.ObjectId(customerId),
        label: label || "Home",
        line1,
        line2,
        city,
        state,
        pincode,
        location: location || { type: "Point", coordinates: [0, 0] },
        isDefault: !!isDefault,
      });

      const saved = await address.save();
      ApiResponseHandler.success(res, 201, "Address saved successfully", saved);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to save address");
    }
  }

  /**
   * GET /api/public/o/:outletSlug/coupons/validate
   * Validates a coupon code and calculates discount for an outlet
   */
  static async validateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug } = req.params;
      const { code, subtotal } = req.query;

      if (!code || !subtotal) {
        ApiResponseHandler.badRequest(res, "Coupon code and subtotal are required");
        return;
      }

      // Check if outlet exists
      const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }

      const validation = await CouponService.validateCoupon(
        outlet.tenantId.toString(),
        outlet._id.toString(),
        code as string,
        Number(subtotal)
      );

      if (!validation.isValid) {
        ApiResponseHandler.badRequest(res, validation.reason || "Invalid coupon code");
        return;
      }

      ApiResponseHandler.success(res, 200, "Coupon is valid", {
        code: validation.coupon?.code,
        discount: validation.discount,
        discountType: validation.coupon?.discountType,
        discountValue: validation.coupon?.discountValue,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to validate coupon");
    }
  }

  /**
   * POST /api/public/checkout
   * Checkout endpoint converting cart to CanonicalOrder, executing ingestion, and creating timeline/checkout session
   */
  static async checkoutCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, customer, fulfillment, payment, couponCode } = req.body;

      if (!cartId || !customer || !customer.name || !customer.phone) {
        ApiResponseHandler.badRequest(res, "cartId, customer name, and phone are required");
        return;
      }

      // 1. Fetch Cart
      const cart = await Cart.findOne({
        _id: new Types.ObjectId(cartId),
        status: "ACTIVE",
        isDeleted: false,
      });

      if (!cart || cart.items.length === 0) {
        ApiResponseHandler.badRequest(res, "Cart is empty or does not exist");
        return;
      }

      // Idempotency Key check
      const idempotencyKey = req.headers["idempotency-key"] as string;
      if (idempotencyKey) {
        const cached = await Idempotency.check(idempotencyKey, cart.tenantId);
        if (cached) {
          res.status(cached.statusCode).json(cached.body);
          return;
        }
      }

      // Inventory Validation
      const unavailableItems = [];
      for (const cartItem of cart.items) {
        const inventory = await Inventory.findOne({
          menuItemId: cartItem.menuItemId,
          outletId: cart.outletId,
          tenantId: cart.tenantId,
          isDeleted: false
        });

        if (inventory && inventory.quantity < cartItem.quantity) {
          const menuItem = await MenuItem.findById(cartItem.menuItemId);
          unavailableItems.push({
            itemId: cartItem.menuItemId.toString(),
            name: menuItem ? menuItem.name : "Item",
            requestedQty: cartItem.quantity,
            availableQty: inventory.quantity
          });
        }
      }

      if (unavailableItems.length > 0) {
        const responseBody = {
          success: false,
          statusCode: 400,
          message: "Stock unavailable",
          data: {
            status: "STOCK_UNAVAILABLE",
            message: "Some items in your cart are no longer available in the requested quantity.",
            unavailableItems
          }
        };
        if (idempotencyKey) {
          await Idempotency.save(idempotencyKey, cart.tenantId, 400, responseBody);
        }
        res.status(400).json(responseBody);
        return;
      }

      // Update ChannelSession checkout steps
      const session = await ChannelSession.findOne({
        sessionToken: cart.sessionToken,
        isDeleted: false,
      });

      if (session) {
        session.checkoutStartedAt = new Date();
        session.checkoutCompletedAt = new Date();
        await session.save();
      }

      // 2. Re-evaluate prices strictly from DB models to prevent price tampering
      let subtotal = 0;
      const formattedItems = [];

      for (const cartItem of cart.items) {
        const menuItem = await MenuItem.findOne({
          _id: cartItem.menuItemId,
          isAvailable: true,
          isDeleted: false,
        });

        if (!menuItem) {
          ApiResponseHandler.badRequest(res, `Menu item ${cartItem.menuItemId} is no longer available`);
          return;
        }

        let itemPrice = menuItem.price;
        let variantName = "";

        if (cartItem.variantId) {
          const variant = await Variant.findOne({
            _id: cartItem.variantId,
            menuItemId: menuItem._id,
            isAvailable: true,
            isDeleted: false,
          });
          if (!variant) {
            ApiResponseHandler.badRequest(res, `Selected variant ${cartItem.variantId} is unavailable`);
            return;
          }
          itemPrice = variant.price;
          variantName = variant.name;
        }

        let itemTotal = itemPrice;
        const addonsList = [];

        for (const addonItem of cartItem.addons) {
          const addon = await Addon.findOne({
            _id: addonItem.addonId,
            menuItemId: menuItem._id,
            isAvailable: true,
            isDeleted: false,
          });
          if (!addon) {
            ApiResponseHandler.badRequest(res, `Selected addon ${addonItem.addonId} is unavailable`);
            return;
          }
          itemTotal += addon.price * addonItem.quantity;
          addonsList.push({
            addonId: addon._id.toString(),
            name: addon.name,
            price: addon.price,
            quantity: addonItem.quantity,
          });
        }

        subtotal += itemTotal * cartItem.quantity;

        formattedItems.push({
          menuItemId: menuItem._id.toString(),
          variantId: cartItem.variantId ? cartItem.variantId.toString() : undefined,
          name: variantName ? `${menuItem.name} (${variantName})` : menuItem.name,
          quantity: cartItem.quantity,
          price: itemPrice,
          addons: addonsList,
          notes: cartItem.notes || undefined,
        });
      }

      const tax = Number((subtotal * 0.05).toFixed(2)); // 5% mock tax
      const deliveryFee = fulfillment?.type === "DELIVERY" ? 50 : 0;
      
      let discount = 0;
      if (couponCode) {
        const validation = await CouponService.validateCoupon(
          cart.tenantId ? cart.tenantId.toString() : "",
          cart.outletId ? cart.outletId.toString() : null,
          couponCode,
          subtotal
        );
        if (!validation.isValid) {
          ApiResponseHandler.badRequest(res, validation.reason || "Invalid coupon code");
          return;
        }
        discount = validation.discount;
      }
      
      const totalAmount = subtotal + tax + deliveryFee - discount;

      // 3. Resolve Delivery address if applicable
      let resolvedAddress = null;
      if (fulfillment?.type === "DELIVERY" && fulfillment.addressId) {
        resolvedAddress = await CustomerAddress.findOne({
          _id: new Types.ObjectId(fulfillment.addressId),
          isDeleted: false,
        });
      }

      const generatedOrderId = `WEB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 4. Construct raw checkout payload matching WebsiteAdapter expectations
      const rawPayload = {
        orderId: generatedOrderId,
        outletId: cart.outletId.toString(),
        couponCode: couponCode || undefined,
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
        },
        fulfillment: {
          type: fulfillment?.type || "DELIVERY",
          addressId: fulfillment?.addressId || undefined,
          scheduledFor: fulfillment?.scheduledFor || undefined,
          instructions: fulfillment?.instructions || undefined,
          address: resolvedAddress ? {
            line1: resolvedAddress.line1,
            line2: resolvedAddress.line2 || undefined,
            city: resolvedAddress.city,
            state: resolvedAddress.state,
            pincode: resolvedAddress.pincode,
          } : undefined,
        },
        payment: {
          mode: payment?.mode || "COD",
          status: payment?.mode === "COD" ? "PENDING" : "SUCCESS",
          transactionId: payment?.transactionId || undefined,
        },
        pricing: {
          subtotal,
          tax,
          deliveryFee,
          discount,
          totalAmount,
        },
        items: formattedItems,
        notes: cart.items.map(i => i.notes).filter(Boolean).join(", ") || undefined,
      };

      // 5. Ingest and Process Order through canonical pipeline
      const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
        tenantId: cart.tenantId.toString(),
        provider: IntegrationProvider.WEBSITE,
        externalOrderId: rawPayload.orderId,
        rawPayload,
        outletId: cart.outletId.toString(),
      });

      const processedOrder = await OrderGatewayService.processExternalOrder({
        externalOrderId: externalOrder._id.toString(),
        tenantId: cart.tenantId.toString(),
      });

      if (processedOrder.status !== "PLACED" || !processedOrder.internalOrderId) {
        ApiResponseHandler.badRequest(res, `Failed to place Website order: ${processedOrder.failureReason}`);
        return;
      }

      // Link customer to session & cart if matches phone number
      const internalCustomer = await Customer.findOne({
        tenantId: cart.tenantId,
        phone: customer.phone,
        isDeleted: false,
      });

      if (internalCustomer) {
        cart.customerId = internalCustomer._id;
      }

      const placedOrder = await Order.findById(processedOrder.internalOrderId);
      const generatedCustomerId = placedOrder?.customerId;
      if (generatedCustomerId) {
        cart.customerId = generatedCustomerId;
        
        // Auto-save CustomerAddress standalone record if raw address was provided
        if (rawPayload.fulfillment.address && !fulfillment.addressId) {
          await CustomerAddress.create({
            tenantId: cart.tenantId,
            customerId: generatedCustomerId,
            label: "Delivery Address",
            line1: rawPayload.fulfillment.address.line1,
            line2: rawPayload.fulfillment.address.line2,
            city: rawPayload.fulfillment.address.city,
            state: rawPayload.fulfillment.address.state,
            pincode: rawPayload.fulfillment.address.pincode,
          });
        }
      }

      // Convert Cart status
      cart.status = "CONVERTED";
      cart.lastActivityAt = new Date();
      await cart.save();

      // 6. Create CheckoutSession
      const checkoutSession = await CheckoutSession.create({
        tenantId: cart.tenantId,
        cartId: cart._id,
        orderId: processedOrder.internalOrderId,
        amount: totalAmount,
        status: rawPayload.payment.status === "SUCCESS" ? "SUCCESS" : "PENDING",
        paymentMethod: rawPayload.payment.mode,
      });

      // Publish event
      await EventBusService.publishCheckoutStarted(cart.tenantId, cart.outletId, cart._id, cart, {
        correlationId: cart.sessionToken,
        sourceSystem: "WEBSITE",
      }).catch(err => console.error("Failed to publish CHECKOUT_STARTED event:", err));

      const responseBody = {
        success: true,
        statusCode: 201,
        message: "Website Checkout completed successfully",
        data: {
          processedOrder,
          checkoutSession,
        }
      };

      if (idempotencyKey) {
        await Idempotency.save(idempotencyKey, cart.tenantId, 201, responseBody);
      }

      res.status(201).json(responseBody);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to complete checkout");
    }
  }

  /**
   * GET /api/public/orders/track/:orderId
   * Retrieves live timeline history querying OrderTimeline collection
   */
  static async trackOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId || !Types.ObjectId.isValid(orderId as string)) {
        ApiResponseHandler.badRequest(res, "A valid orderId parameter is required");
        return;
      }

      // Fetch order details
      const order = await Order.findOne({
        _id: new Types.ObjectId(orderId as string),
        isDeleted: false,
      });

      if (!order) {
        ApiResponseHandler.notFound(res, "Order not found");
        return;
      }

      // Fetch timeline logs
      const timeline = await OrderTimeline.find({
        orderId: order._id,
        isDeleted: false,
      }).sort({ timestamp: 1 });

      ApiResponseHandler.success(res, 200, "Order tracking timeline retrieved successfully", {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
        },
        timeline,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve tracking details");
    }
  }

  /**
   * POST /api/public/cart/reorder
   * Reorders a previous order by validating item availability and rebuilding the cart with current pricing.
   */
  static async reorderToCart(req: Request, res: Response): Promise<void> {
    try {
      const { previousOrderId, sessionToken } = req.body;

      if (!previousOrderId || !sessionToken) {
        ApiResponseHandler.badRequest(res, "previousOrderId and sessionToken are required");
        return;
      }

      // 1. Fetch Previous Order
      const order = await Order.findOne({
        _id: new Types.ObjectId(previousOrderId),
        isDeleted: false,
      });

      if (!order) {
        ApiResponseHandler.notFound(res, "Previous order not found");
        return;
      }

      // 2. Fetch Order Items
      const orderItems = await OrderItem.find({
        orderId: order._id,
        isDeleted: false,
      });

      if (orderItems.length === 0) {
        ApiResponseHandler.badRequest(res, "Previous order has no items");
        return;
      }

      // 3. Resolve or create active Cart
      let cart = await Cart.findOne({
        sessionToken,
        status: "ACTIVE",
        isDeleted: false,
      });

      if (!cart) {
        cart = new Cart({
          tenantId: order.tenantId,
          outletId: order.outletId,
          sessionToken,
          items: [],
          status: "ACTIVE",
          lastActivityAt: new Date(),
        });
      } else {
        // Enforce outlet isolation: cart must belong to same outlet as the previous order
        if (cart.outletId.toString() !== order.outletId.toString()) {
          ApiResponseHandler.badRequest(res, "Cart contains items from another outlet. Reordering from a different outlet is rejected.");
          return;
        }
      }

      const warnings: string[] = [];
      const activeCart = cart!;

      // 4. Revalidate Availability and Build Cart Items
      for (const orderItem of orderItems) {
        // Revalidate MenuItem
        const menuItem = await MenuItem.findOne({
          _id: orderItem.menuItemId,
          isAvailable: true,
          isDeleted: false,
        });

        if (!menuItem) {
          warnings.push(`Item '${orderItem.name}' is no longer available and was skipped.`);
          continue;
        }

        // Revalidate Variant if applicable
        let variantId: Types.ObjectId | null = null;
        if (orderItem.variantId) {
          const variant = await Variant.findOne({
            _id: orderItem.variantId,
            menuItemId: menuItem._id,
            isAvailable: true,
            isDeleted: false,
          });

          if (!variant) {
            warnings.push(`Selected variant for '${orderItem.name}' is no longer available. Skipped.`);
            continue;
          }
          variantId = variant._id as Types.ObjectId;
        }

        // Revalidate Addons
        const validatedAddons: { addonId: Types.ObjectId; quantity: number }[] = [];
        let addonFailure = false;

        for (const addonItem of orderItem.addons) {
          const addon = await Addon.findOne({
            _id: addonItem.addonId,
            menuItemId: menuItem._id,
            isAvailable: true,
            isDeleted: false,
          });

          if (!addon) {
            warnings.push(`Selected addon '${addonItem.name}' for item '${orderItem.name}' is no longer available. Skipped.`);
            addonFailure = true;
            break;
          }

          validatedAddons.push({
            addonId: addon._id as Types.ObjectId,
            quantity: 1, // default quantity to 1
          });
        }

        if (addonFailure) {
          continue;
        }

        // Add to cart items array
        const existingItemIndex = activeCart.items.findIndex((cartItem) => {
          const matchMenuItem = cartItem.menuItemId.toString() === menuItem._id.toString();
          const matchVariant = (!cartItem.variantId && !variantId) || 
            (cartItem.variantId?.toString() === variantId?.toString());
          
          if (!matchMenuItem || !matchVariant) return false;
          if (cartItem.addons.length !== validatedAddons.length) return false;
          
          return validatedAddons.every((newAddon: any) =>
            cartItem.addons.some(
              (existingAddon) =>
                existingAddon.addonId.toString() === newAddon.addonId.toString()
            )
          );
        });

        if (existingItemIndex > -1) {
          const cartItem = activeCart.items[existingItemIndex];
          if (cartItem) {
            cartItem.quantity += orderItem.quantity;
          }
        } else {
          activeCart.items.push({
            menuItemId: menuItem._id as Types.ObjectId,
            variantId,
            addons: validatedAddons,
            quantity: orderItem.quantity,
            notes: orderItem.notes || null,
          });
        }
      }

      if (activeCart.items.length === 0) {
        ApiResponseHandler.badRequest(
          res,
          "None of the items from the previous order are currently available. Reorder failed."
        );
        return;
      }

      activeCart.lastActivityAt = new Date();
      await activeCart.save();
      await activeCart.populate([
        { path: "items.menuItemId" },
        { path: "items.variantId" },
        { path: "items.addons.addonId" }
      ]);

      // Publish event
      await EventBusService.publishCartUpdated(activeCart.tenantId, activeCart.outletId, activeCart._id, activeCart, {
        correlationId: activeCart.sessionToken,
        sourceSystem: "WEBSITE",
      }).catch(err => console.error("Failed to publish CART_UPDATED event:", err));

      ApiResponseHandler.success(res, 200, "Reorder processed successfully", {
        cart: activeCart,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to process reorder");
    }
  }

  /**
   * GET /api/public/qr/resolve/:tableToken
   * Resolves table by QR token, creates/joins active QRSession, manages guest sessions,
   * handles "Join Existing Table" vs "Start New Group" selection, and returns session tokens.
   */
  static async resolveQrCode(req: Request, res: Response): Promise<void> {
    try {
      const { tableToken } = req.params;
      const { action } = req.query; // 'join' or 'new'
      const clientGuestToken = req.headers["x-guest-session-token"];

      const table = await Table.findOne({ qrToken: tableToken, isDeleted: false });
      if (!table || table.status !== "ACTIVE") {
        ApiResponseHandler.notFound(res, "Table not found or is currently inactive");
        return;
      }

      if (table.operationalStatus === "RESERVED") {
        ApiResponseHandler.badRequest(res, "This table has already been reserved. Please contact staff.");
        return;
      }

      if (table.operationalStatus === "CLEANING") {
        ApiResponseHandler.badRequest(res, "Table is currently being cleaned. Please wait.");
        return;
      }

      const outlet = await Outlet.findOne({ _id: table.outletId, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }

      let session: any = null;
      if (table.activeSessionId) {
        session = await QRSession.findById(table.activeSessionId);
      }

      const hasActiveSession = session && session.status !== "CLOSED" && session.status !== "EXPIRED";

      // 1. Check for existing active guests to prompt join vs new group
      if (hasActiveSession && !action) {
        const activeGuests = await GuestSession.find({
          qrsessionId: session._id,
          status: "ACTIVE"
        });

        // If other guests are active at this table, require explicit confirmation
        if (activeGuests.length > 0) {
          // If the user already has a valid active GuestSession token matching this table, allow auto-rejoin
          let existingGuest = null;
          if (clientGuestToken) {
            existingGuest = await GuestSession.findOne({
              qrsessionId: session._id,
              guestSessionToken: String(clientGuestToken),
              status: "ACTIVE"
            });
          }

          if (!existingGuest) {
            ApiResponseHandler.success(res, 200, "Active group session exists. Prompt join flow.", {
              promptRequired: true,
              activeGuestsCount: activeGuests.length,
              activeGuestsNames: activeGuests.map(g => g.name),
              outletSlug: outlet.slug,
              tableNumber: table.tableNumber
            });
            return;
          }
        }
      }

      // 2. Handle Action: Start New Group
      if (action === "new" && hasActiveSession) {
        // Close existing QRSession
        session.status = "CLOSED";
        session.closedAt = new Date();
        await session.save();

        // Archive open BillSession without marking as SETTLED (no payment was received).
        // Use VOIDED status so the finance audit trail clearly shows these were force-closed.
        await BillSession.updateMany(
          { sessionId: session._id, status: { $in: ["OPEN", "REQUESTED"] } },
          { status: "VOIDED", voidedAt: new Date(), voidReason: "SESSION_FORCE_CLOSED" }
        );

        session = null;
      }

      // 3. Resolve or initialize QRSession
      if (!session || session.status === "CLOSED" || session.status === "EXPIRED") {
        const newSession = await QRSession.create({
          tenantId: table.tenantId,
          outletId: table.outletId,
          tableId: table._id,
          status: "ACTIVE",
          openedAt: new Date(),
          menuViewedAt: new Date(),
          seats: [{ seatNumber: "Seat 1", joinedAt: new Date() }],
          waiterId: table.defaultWaiterId || null
        });

        // Atomic check: only update if activeSessionId is currently null and table is not reserved/cleaning
        const updatedTable = await Table.findOneAndUpdate(
          {
            _id: table._id,
            activeSessionId: null,
            operationalStatus: { $nin: ["RESERVED", "CLEANING"] }
          },
          {
            activeSessionId: newSession._id,
            operationalStatus: "OCCUPIED"
          },
          { new: true }
        );

        if (!updatedTable) {
          // Lost race or table transitioned to reserved/cleaning! Delete newSession
          await QRSession.deleteOne({ _id: newSession._id });
          const winningTable = await Table.findById(table._id);
          if (winningTable && ["RESERVED", "CLEANING"].includes(winningTable.operationalStatus)) {
            ApiResponseHandler.badRequest(res, `Table is currently ${winningTable.operationalStatus.toLowerCase()}. Please contact staff.`);
            return;
          }
          session = await QRSession.findById(winningTable?.activeSessionId);
          if (!session) {
            ApiResponseHandler.badRequest(res, "Table is currently unavailable. Please try again.");
            return;
          }
        } else {
          session = newSession;
        }
      } else {
        table.operationalStatus = "OCCUPIED";
        await table.save();
      }

      await EventBusService.publishTableOccupied(
        table.tenantId,
        table.outletId,
        table._id,
        {
          tableId: table._id.toString(),
          tableNumber: table.tableNumber,
          status: table.operationalStatus,
          updatedAt: new Date()
        },
        { sourceSystem: "QR" }
      );

      // 4. Resolve or initialize GuestSession (Host vs Member)
      let guestSession = null;
      if (clientGuestToken) {
        guestSession = await GuestSession.findOne({
          qrsessionId: session._id,
          guestSessionToken: String(clientGuestToken),
          status: "ACTIVE"
        });
      }

      if (!guestSession) {
        const activeGuestsCount = await GuestSession.countDocuments({
          qrsessionId: session._id,
          status: "ACTIVE"
        });

        const guestSessionToken = "GUEST-SESS-" + Math.random().toString(36).substring(2, 15).toUpperCase() + "-" + Date.now();
        guestSession = await GuestSession.create({
          qrsessionId: session._id,
          guestSessionToken,
          name: "Guest",
          role: activeGuestsCount === 0 ? "HOST" : "MEMBER",
          status: "ACTIVE",
          joinedAt: new Date(),
          lastSeenAt: new Date()
        });
      } else {
        guestSession.lastSeenAt = new Date();
        await guestSession.save();
      }

      // Fetch dining area name if available
      let diningAreaName = "Dine-In";
      if (table.diningAreaId) {
        const da = await DiningArea.findById(table.diningAreaId);
        if (da) diningAreaName = da.name;
      }

      ApiResponseHandler.success(res, 200, "QR Code resolved successfully", {
        outletSlug: outlet.slug,
        outletName: outlet.name,
        outletAddress: outlet.address,
        tenantId: table.tenantId.toString(),
        outletId: table.outletId.toString(),
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        diningAreaName,
        sessionToken: session.sessionToken,
        sessionId: session._id.toString(),
        guestSessionToken: guestSession.guestSessionToken,
        guestSession: {
          name: guestSession.name,
          role: guestSession.role,
          seatNumber: guestSession.seatNumber,
          guestCount: guestSession.guestCount
        }
      });
    } catch (error: any) {
      console.error("[PublicController] resolveQrCode error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to resolve QR Code");
    }
  }

  /**
   * GET /api/public/qr/session/:sessionToken/bill
   * Retrieves the active QR session's orders, items, and billing details
   */
  static async getQrSessionBill(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.params;

      const session = await QRSession.findOne({ sessionToken, isDeleted: false });
      if (!session) {
        ApiResponseHandler.notFound(res, "Active session not found");
        return;
      }

      if (session.status === "CLOSED" || session.status === "EXPIRED") {
        ApiResponseHandler.badRequest(res, "Session has already been closed");
        return;
      }

      const result = await BillingService.getSessionBill(session.tenantId, session._id.toString());
      
      // Let's also attach table details
      const table = await Table.findById(session.tableId);

      ApiResponseHandler.success(res, 200, "QR Session bill retrieved successfully", {
        ...result,
        table: table ? {
          tableNumber: table.tableNumber,
          operationalStatus: table.operationalStatus,
          seatCount: table.seatCount
        } : null
      });
    } catch (error: any) {
      console.error("[PublicController] getQrSessionBill error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve QR session bill");
    }
  }

  /**
   * POST /api/public/qr/session/:sessionToken/pay
   * Submit payment request (UPI, PhonePe, Card, Cash) for dine-in tables
   */
  static async payQrSessionBill(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.params;
      const { paymentMode, tip, seatNumber } = req.body;

      const session = await QRSession.findOne({ sessionToken, isDeleted: false });
      if (!session) {
        ApiResponseHandler.notFound(res, "Active session not found");
        return;
      }

      if (session.status === "CLOSED" || session.status === "EXPIRED") {
        ApiResponseHandler.badRequest(res, "Session is already closed");
        return;
      }

      // 1. Retrieve/Generate BillSession
      const billData = await BillingService.getSessionBill(session.tenantId, session._id.toString());
      if (!billData.billSession) {
        ApiResponseHandler.badRequest(res, "No bill session found to pay");
        return;
      }

      // Idempotency Key check
      const idempotencyKey = req.headers["idempotency-key"] as string;
      if (idempotencyKey) {
        const cached = await Idempotency.check(idempotencyKey, session.tenantId);
        if (cached) {
          res.status(cached.statusCode).json(cached.body);
          return;
        }
      }

      if (billData.billSession.status === "SETTLED") {
        const responseBody = {
          success: false,
          statusCode: 400,
          message: "This bill session is already settled"
        };
        if (idempotencyKey) {
          await Idempotency.save(idempotencyKey, session.tenantId, 400, responseBody);
        }
        res.status(400).json(responseBody);
        return;
      }

      if (seatNumber && billData.billSession.splits && billData.billSession.splits.length > 0) {
        const split = billData.billSession.splits.find((s: any) => s.seatNumber === seatNumber);
        if (split && split.isPaid) {
          const responseBody = {
            success: false,
            statusCode: 400,
            message: `Seat ${seatNumber} has already been paid`
          };
          if (idempotencyKey) {
            await Idempotency.save(idempotencyKey, session.tenantId, 400, responseBody);
          }
          res.status(400).json(responseBody);
          return;
        }
      }

      const billSessionId = billData.billSession._id.toString();

      // Apply tip adjustments if needed
      if (tip && Number(tip) > 0) {
        await BillingService.requestBill(session.tenantId, session.outletId, session._id.toString(), {
          tip: Number(tip),
          notes: "Tip added by customer"
        });
      }

      if (paymentMode === "CASH") {
        // Request bill (sets statuses)
        await BillingService.requestBill(session.tenantId, session.outletId, session._id.toString(), {
          notes: `Cash payment requested${seatNumber ? ` for seat ${seatNumber}` : ""}`
        });

        // Trigger Waiter Task
        const waiterTask = await WaiterTaskService.createTask(
          session.tenantId,
          session.outletId,
          session.tableId,
          session._id,
          "BILL",
          "CUSTOMER",
          {
            priority: "HIGH",
            seatNumber: seatNumber || undefined,
            metadata: {
              paymentMode: "CASH",
              notes: "Diner requested cash payment at table"
            }
          }
        );

        const responseBody = {
          success: true,
          statusCode: 200,
          message: "Cash payment requested. Waiter notified.",
          data: {
            status: "REQUESTED",
            taskId: waiterTask._id.toString()
          }
        };

        if (idempotencyKey) {
          await Idempotency.save(idempotencyKey, session.tenantId, 200, responseBody);
        }

        res.status(200).json(responseBody);
        return;
      }

      // For UPI / PHONEPE / CARD: Settle instantly
      let finalPaymentMethod = PaymentMethod.UPI;
      if (paymentMode === "CARD") {
        finalPaymentMethod = PaymentMethod.CARD;
      } else if (paymentMode === "PHONEPE" || paymentMode === "UPI") {
        finalPaymentMethod = PaymentMethod.UPI;
      }

      // Calculate correct payment amount matching seat split if active
      let paymentAmount = billData.billSession.outstandingBalance;
      if (seatNumber && billData.billSession.splits && billData.billSession.splits.length > 0) {
        const split = billData.billSession.splits.find((s: any) => s.seatNumber === seatNumber);
        if (split) {
          paymentAmount = split.amount;
        }
      }

      // Create a single Payment document representing the full session payment.
      const transactionId = `TXN-QR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const primaryOrderId = billData.billSession.orderIds?.[0];
      if (!primaryOrderId) {
        ApiResponseHandler.badRequest(res, "Bill session has no associated orders");
        return;
      }
      const paymentDoc = await Payment.create({
        tenantId: session.tenantId,
        orderId: primaryOrderId,         // FK to first order; billSessionId links the aggregate
        billSessionId: billData.billSession._id,
        transactionId,
        paymentMethod: finalPaymentMethod,
        amount: paymentAmount,
        currency: "INR",
        status: PaymentStatus.SUCCESS
      });

      // Call settleBill
      const result = await BillingService.settleBill(session.tenantId, session.outletId, billSessionId, {
        seatNumber: seatNumber || undefined,
        paymentId: paymentDoc._id.toString()
      });

      // Automatically recalculate bill session totals on payment
      await BillingService.recalculateBillSession(session.tenantId, session._id);

      const responseBody = {
        success: true,
        statusCode: 200,
        message: "Payment processed successfully",
        data: result
      };

      if (idempotencyKey) {
        await Idempotency.save(idempotencyKey, session.tenantId, 200, responseBody);
      }

      res.status(200).json(responseBody);
    } catch (error: any) {
      console.error("[PublicController] payQrSessionBill error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to process payment");
    }
  }

  /**
   * POST /api/public/qr/session/:sessionToken/bill/split
   * Triggers bill session splitting by EQUAL, BY_SEAT, or CUSTOM strategy
   */
  static async splitQrSessionBill(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.params;
      const { splitType, customSplits } = req.body; // splitType: 'EQUAL' | 'BY_SEAT' | 'CUSTOM'

      const session = await QRSession.findOne({ sessionToken, isDeleted: false });
      if (!session) {
        ApiResponseHandler.notFound(res, "Active session not found");
        return;
      }

      const billData = await BillingService.getSessionBill(session.tenantId, session._id.toString());
      if (!billData.billSession) {
        ApiResponseHandler.badRequest(res, "No active bill session found to split");
        return;
      }

      const result = await BillingService.splitBill(
        session.tenantId,
        session.outletId,
        billData.billSession._id.toString(),
        splitType,
        customSplits
      );

      ApiResponseHandler.success(res, 200, "Bill split successfully", result);
    } catch (error: any) {
      console.error("[PublicController] splitQrSessionBill error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to split bill");
    }
  }

  /**
   * PATCH /api/public/qr/guest/session
   * Updates guest name, phone, seat number, and guest count in active GuestSession
   */
  static async updateGuestSession(req: Request, res: Response): Promise<void> {
    try {
      const guestSessionToken = req.headers["x-guest-session-token"];
      if (!guestSessionToken) {
        ApiResponseHandler.badRequest(res, "Guest session token is required");
        return;
      }

      const { name, phone, seatNumber, guestCount } = req.body;

      const guestSession = await GuestSession.findOne({ 
        guestSessionToken: String(guestSessionToken),
        status: "ACTIVE"
      });

      if (!guestSession) {
        ApiResponseHandler.notFound(res, "Active guest session not found");
        return;
      }

      if (name !== undefined) guestSession.name = name;
      if (phone !== undefined) guestSession.phone = phone;
      if (seatNumber !== undefined) guestSession.seatNumber = seatNumber;
      if (guestCount !== undefined) guestSession.guestCount = Number(guestCount);
      guestSession.lastSeenAt = new Date();

      await guestSession.save();

      ApiResponseHandler.success(res, 200, "Guest session updated successfully", guestSession);
    } catch (error: any) {
      console.error("[PublicController] updateGuestSession error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to update guest session");
    }
  }

  /**
   * POST /api/public/qr/guest/session/leave
   * Marks the current guest session as LEFT. If no other active guest sessions remain, closes the table session.
   */
  static async leaveGuestSession(req: Request, res: Response): Promise<void> {
    try {
      const guestSessionToken = req.headers["x-guest-session-token"];
      if (!guestSessionToken) {
        ApiResponseHandler.badRequest(res, "Guest session token is required");
        return;
      }

      const guestSession = await GuestSession.findOne({ 
        guestSessionToken: String(guestSessionToken),
        status: "ACTIVE"
      });

      if (!guestSession) {
        ApiResponseHandler.notFound(res, "Active guest session not found");
        return;
      }

      // 0. Fetch Table/Outlet settings for cancel approval
      const qrSession = await QRSession.findById(guestSession.qrsessionId);
      if (!qrSession) {
        ApiResponseHandler.notFound(res, "Associated QR session not found");
        return;
      }

      const table = await Table.findById(qrSession.tableId);
      const outlet = await Outlet.findById(qrSession.outletId);
      const tenantId = qrSession.tenantId;

      // 1. Fetch active orders
      const orders = await mongoose.model("Order").find({
        "diningContext.sessionId": qrSession._id,
        tenantId,
        orderStatus: { $ne: OrderStatus.CANCELLED },
        isDeleted: false
      });

      // Group orders by status
      const hasServed = orders.some(o => o.orderStatus === OrderStatus.SERVED);
      const hasKitchenAccepted = orders.some(o => [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY].includes(o.orderStatus));
      const hasPending = orders.some(o => o.orderStatus === OrderStatus.PENDING);

      const cancelReason = req.body.reason || "Customer left dining session";

      if (hasServed) {
        // Case 4: Outstanding bill exists
        ApiResponseHandler.success(res, 200, "Outstanding bill exists. Please settle the balance first.", {
          status: "BILL_OUTSTANDING",
          message: "You have served items and an outstanding bill exists. Please settle the balance first."
        });
        return;
      }

      const approvalMode = outlet?.orderCancellationApproval || "WAITER";

      if (hasKitchenAccepted) {
        if (approvalMode === "AUTO") {
          // Cancel automatically
          for (const order of orders) {
            await OrderService.cancelOrder(order._id.toString(), tenantId.toString(), cancelReason, guestSession._id.toString());
          }
        } else {
          // Case 3: Requires approval. Create WaiterTask
          const existingTask = await WaiterTask.findOne({
            sessionId: qrSession._id,
            taskType: "ORDER_CANCEL_REQUEST",
            status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] },
            isDeleted: false
          });

          if (!existingTask) {
            await WaiterTaskService.createTask(
              tenantId,
              qrSession.outletId,
              qrSession.tableId,
              qrSession._id,
              "ORDER_CANCEL_REQUEST",
              "CUSTOMER",
              {
                priority: "HIGH",
                ...(guestSession.seatNumber ? { seatNumber: guestSession.seatNumber } : {}),
                metadata: {
                  guestSessionId: guestSession._id.toString(),
                  reason: cancelReason,
                  notes: `Customer requested cancel & leave. Approval required by: ${approvalMode}`
                }
              }
            );
          }

          ApiResponseHandler.success(res, 200, "Cancellation request sent to staff.", {
            status: "REQUIRES_APPROVAL",
            message: "Kitchen has already accepted your order. A cancellation request has been sent to staff."
          });
          return;
        }
      } else if (hasPending) {
        // Case 2: PENDING orders only. Cancel automatically.
        for (const order of orders) {
          await OrderService.cancelOrder(order._id.toString(), tenantId.toString(), cancelReason, guestSession._id.toString());
        }
      }

      // Mark GuestSession as LEFT
      guestSession.status = "LEFT";
      await guestSession.save();

      // Check if other active guest sessions exist for this QRSession
      const remainingActiveGuests = await GuestSession.find({
        qrsessionId: guestSession.qrsessionId,
        status: "ACTIVE"
      });

      const remainingActive = remainingActiveGuests.length;

      if (remainingActive === 0) {
        if (qrSession.status !== "CLOSED" && qrSession.status !== "EXPIRED") {
          qrSession.status = "CLOSED";
          qrSession.closedAt = new Date();
          await qrSession.save();

          // Reset table operational status
          if (table) {
            table.operationalStatus = "AVAILABLE";
            table.activeSessionId = null;
            await table.save();

            // Publish WebSocket updates/Events
            await EventBusService.publishTableOccupied(
              table.tenantId,
              table.outletId,
              table._id,
              {
                tableId: table._id.toString(),
                tableNumber: table.tableNumber,
                status: "AVAILABLE",
                updatedAt: new Date()
              },
              { sourceSystem: "QR" }
            );
          }
        }
      } else {
        // Phase 3: Host successor promotion
        if (guestSession.role === "HOST") {
          let successor = null;
          const { successorGuestSessionId } = req.body;
          if (successorGuestSessionId) {
            successor = remainingActiveGuests.find(g => g._id.toString() === successorGuestSessionId);
          }
          if (!successor) {
            successor = remainingActiveGuests.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
          }
          if (successor) {
            successor.role = "HOST";
            await successor.save();

            const { RealtimeService } = await import("../../sockets/realtime.service.js");
            RealtimeService.sendToSession(qrSession._id.toString(), "HOST_TRANSFERRED" as any, {
              oldHostId: guestSession._id.toString(),
              newHostId: successor._id.toString(),
              newHostName: successor.name
            });
          }
        }
      }

      // Recalculate bill automatically on leave/cancellations
      await BillingService.recalculateBillSession(tenantId, qrSession._id);

      ApiResponseHandler.success(res, 200, "Left guest session successfully", { remainingActive });
    } catch (error: any) {
      console.error("[PublicController] leaveGuestSession error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to leave guest session");
    }
  }

  /**
   * GET /api/public/qr/session/:sessionToken/guests
   * Lists all active guest sessions for a table session
   */
  static async getQrSessionGuests(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.params;
      const qrSession = await QRSession.findOne({ sessionToken, isDeleted: false });
      if (!qrSession) {
        ApiResponseHandler.notFound(res, "Active QR session not found");
        return;
      }

      const guests = await GuestSession.find({
        qrsessionId: qrSession._id,
        status: "ACTIVE"
      });

      ApiResponseHandler.success(res, 200, "Active guests retrieved successfully", guests);
    } catch (error: any) {
      console.error("[PublicController] getQrSessionGuests error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve guest sessions");
    }
  }

  /**
   * GET /api/public/o/:outletSlug/coupons
   * Lists all active coupons applicable for this outlet
   */
  static async listOutletCoupons(req: Request, res: Response): Promise<void> {
    try {
      const { outletSlug } = req.params;
      const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
      if (!outlet) {
        ApiResponseHandler.notFound(res, "Outlet not found");
        return;
      }

      // Find active coupons matching conditions matching ICoupon schema
      const coupons = await Coupon.find({
        isActive: true,
        isDeleted: false,
        $or: [
          { expirationDate: null },
          { expirationDate: { $gt: new Date() } }
        ]
      });

      ApiResponseHandler.success(res, 200, "Coupons retrieved successfully", coupons);
    } catch (error: any) {
      console.error("[PublicController] listOutletCoupons error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve coupons");
    }
  }

  /**
   * POST /api/public/qr/session/:sessionToken/feedback
   * Submits diner rating and feedback review, inserting it into ReviewAnalytics database
   */
  static async submitQrSessionFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.params;
      const { rating, reviewText } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        ApiResponseHandler.badRequest(res, "A valid rating between 1 and 5 is required");
        return;
      }

      const session = await QRSession.findOne({ sessionToken, isDeleted: false });
      if (!session) {
        ApiResponseHandler.notFound(res, "Active session not found");
        return;
      }

      // Import ReviewAnalytics model dynamically to use it
      const ReviewAnalytics = mongoose.model("ReviewAnalytics");

      const feedback = await ReviewAnalytics.create({
        tenantId: session.tenantId,
        outletId: session.outletId,
        source: "INTERNAL",
        rating: Number(rating),
        reviewText: reviewText || "",
        sentimentScore: Number(rating) >= 4 ? 0.8 : Number(rating) <= 2 ? -0.8 : 0.0,
        sentimentLabel: Number(rating) >= 4 ? "POSITIVE" : Number(rating) <= 2 ? "NEGATIVE" : "NEUTRAL",
        reviewDate: new Date()
      });

      ApiResponseHandler.success(res, 201, "Feedback submitted successfully", feedback);
    } catch (error: any) {
      console.error("[PublicController] submitQrSessionFeedback error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to submit feedback");
    }
  }

  /**
   * POST /api/public/orders/:orderId/items/:itemId/cancel
   * Cancels a specific order item or requests approval based on order state.
   */
  static async cancelOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, itemId } = req.params;
      const { reason } = req.body;

      if (!orderId || !itemId) {
        ApiResponseHandler.badRequest(res, "orderId and itemId are required");
        return;
      }

      const orderObjId = new Types.ObjectId(String(orderId));
      const itemObjId = new Types.ObjectId(String(itemId));

      const order = await Order.findOne({ _id: orderObjId, isDeleted: false });
      if (!order) {
        ApiResponseHandler.notFound(res, "Order not found");
        return;
      }

      const orderItem = await OrderItem.findOne({ _id: itemObjId, orderId: orderObjId, isDeleted: false });
      if (!orderItem) {
        ApiResponseHandler.notFound(res, "Order item not found");
        return;
      }

      if (orderItem.status === ("CANCELLED" as any)) {
        ApiResponseHandler.badRequest(res, "Item is already cancelled");
        return;
      }

      const currentStatus = order.orderStatus;
      const tenantId = order.tenantId;

      if (currentStatus === OrderStatus.PENDING) {
        orderItem.status = "CANCELLED" as any;
        await orderItem.save();

        const siblingItems = await OrderItem.find({ orderId: order._id, status: { $ne: "CANCELLED" as any }, isDeleted: false });
        const newSubtotal = siblingItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const newTax = parseFloat((newSubtotal * 0.05).toFixed(2));
        const newTotal = newSubtotal + newTax;

        order.subtotal = newSubtotal;
        order.tax = newTax;
        order.totalAmount = newTotal;

        if (siblingItems.length === 0) {
          order.orderStatus = OrderStatus.CANCELLED;
          order.cancelledAt = new Date();
          order.cancellationReason = reason || "All items cancelled";
        }
        await order.save();

        await OrderTimeline.create({
          tenantId,
          qrsessionId: order.sessionId,
          orderId: order._id,
          status: "ORDER_UPDATED" as any,
          notes: `Item ${orderItem.name} cancelled. Reason: ${reason || "Changed mind"}`,
          timestamp: new Date()
        });

        if (order.sessionId) {
          await BillingService.recalculateBillSession(tenantId, order.sessionId);
        }

        ApiResponseHandler.success(res, 200, "Item cancelled successfully", {
          status: "CANCELLED",
          order
        });
        return;
      } else if (
        currentStatus === OrderStatus.ACCEPTED ||
        currentStatus === OrderStatus.PREPARING ||
        currentStatus === OrderStatus.READY
      ) {
        const outlet = await Outlet.findById(order.outletId);
        const approvalMode = outlet?.orderCancellationApproval || "WAITER";

        if (approvalMode === "AUTO") {
          orderItem.status = "CANCELLED" as any;
          await orderItem.save();

          const siblingItems = await OrderItem.find({ orderId: order._id, status: { $ne: "CANCELLED" as any }, isDeleted: false });
          const newSubtotal = siblingItems.reduce((sum, i) => sum + i.totalPrice, 0);
          const newTax = parseFloat((newSubtotal * 0.05).toFixed(2));
          const newTotal = newSubtotal + newTax;

          order.subtotal = newSubtotal;
          order.tax = newTax;
          order.totalAmount = newTotal;

          if (siblingItems.length === 0) {
            order.orderStatus = OrderStatus.CANCELLED;
            order.cancelledAt = new Date();
            order.cancellationReason = reason || "All items cancelled";
          }
          await order.save();

          const inventory = await Inventory.findOne({
            menuItemId: orderItem.menuItemId,
            outletId: order.outletId,
            tenantId,
            isDeleted: false
          });
          if (inventory) {
            const newQty = inventory.quantity + orderItem.quantity;
            await Inventory.updateOne({ _id: inventory._id }, { quantity: newQty, isLowStock: newQty <= inventory.threshold });
          }

          await OrderTimeline.create({
            tenantId,
            qrsessionId: order.sessionId,
            orderId: order._id,
            status: "ORDER_UPDATED" as any,
            notes: `Item ${orderItem.name} cancelled automatically. Reason: ${reason || "Changed mind"}`,
            timestamp: new Date()
          });

          if (order.sessionId) {
            await BillingService.recalculateBillSession(tenantId, order.sessionId);
          }

          ApiResponseHandler.success(res, 200, "Item cancelled successfully", {
            status: "CANCELLED",
            order
          });
          return;
        }

        const existingTask = await WaiterTask.findOne({
          sessionId: order.sessionId,
          taskType: "ORDER_CANCEL_REQUEST",
          "metadata.itemId": itemId,
          status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] },
          isDeleted: false
        });

        if (!existingTask) {
          await WaiterTaskService.createTask(
            tenantId,
            order.outletId,
            order.diningContext?.tableId || order.outletId,
            order.sessionId || order._id,
            "ORDER_CANCEL_REQUEST",
            "CUSTOMER",
            {
              priority: "HIGH",
              metadata: {
                itemId: itemId,
                orderId: orderId,
                reason: reason || "Wrong item",
                notes: `Customer requested cancellation of item: ${orderItem.name}`
              }
            }
          );
        }

        ApiResponseHandler.success(res, 200, "Cancellation request sent to staff", {
          status: "REQUIRES_APPROVAL",
          message: `Cancellation of ${orderItem.name} requires staff approval.`
        });
        return;
      } else {
        ApiResponseHandler.badRequest(res, `Cannot cancel item when order status is ${currentStatus}`);
      }
    } catch (error: any) {
      console.error("[PublicController] cancelOrderItem error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to cancel order item");
    }
  }
}
