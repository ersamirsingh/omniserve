import { Types } from "mongoose";
import Outlet from "../models/outlet.model.js";
import Table from "../models/table.model.js";
import DiningArea from "../models/diningarea.model.js";
import QRSession from "../models/qrsession.model.js";
import OrderGroup from "../models/ordergroup.model.js";
import BillSession from "../models/billsession.model.js";
import Category from "../models/category.model.js";
import MenuItem from "../models/menuitems.model.js";
import Variant from "../models/variant.model.js";
import Addon from "../models/addon.model.js";
import Inventory from "../models/inventory.model.js";
import Cart from "../models/cart.model.js";
import CheckoutSession from "../models/checkoutsession.model.js";
import ChannelSession from "../models/channelsession.model.js";
import CustomerAddress from "../models/customeraddress.model.js";
import OrderTimeline from "../models/ordertimeline.model.js";
import Order from "../models/order.model.js";
import OrderItem from "../models/orderitems.model.js";
import Customer from "../models/customer.model.js";
import { OrderGatewayService } from "../services/ordergateway.service.js";
import { EventBusService } from "../services/event-bus.service.js";
import { IntegrationProvider } from "../types/integration.type.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
export class PublicController {
    /**
     * GET /api/public/o/:outletSlug/menu
     * Retrieves categories, items, variants, and addons for a slug
     */
    static async getPublicMenu(req, res) {
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
                const inventoryMap = new Map();
                inventories.forEach((inv) => {
                    inventoryMap.set(inv.menuItemId.toString(), inv.quantity);
                });
                // Keep items if they either have no inventory record, or have quantity > 0
                menuItems = rawMenuItems.filter((item) => {
                    const qty = inventoryMap.get(item._id.toString());
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve public menu");
        }
    }
    /**
     * GET /api/public/o/:outletSlug/t/:tableToken/menu
     * Retrieves public menu alongside table info, dining area details, and manages QRSession funnel
     */
    static async getTableSpecificMenu(req, res) {
        try {
            const { outletSlug, tableToken } = req.params;
            // 1. Find Table by token
            const table = await Table.findOne({ qrToken: tableToken, isDeleted: false });
            if (!table || table.status !== "ACTIVE") {
                ApiResponseHandler.notFound(res, "Table not found or is currently inactive");
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
            }
            else if (!session.menuViewedAt) {
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
            const inventoryMap = new Map();
            inventories.forEach((inv) => {
                inventoryMap.set(inv.menuItemId.toString(), inv.quantity);
            });
            const menuItems = rawMenuItems.filter((item) => {
                const qty = inventoryMap.get(item._id.toString());
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve table menu");
        }
    }
    /**
     * POST /api/public/qr/orders
     * Places an order for a scanned table session
     */
    static async placeQrOrder(req, res) {
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
            }
            else {
                session.orderPlacedAt = new Date();
                if (!session.firstItemAddedAt)
                    session.firstItemAddedAt = new Date();
                if (!session.checkoutStartedAt)
                    session.checkoutStartedAt = new Date();
                await session.save();
            }
            // 3. Compute totals from items payload
            let subtotal = 0;
            const formattedItems = items.map((item) => {
                const itemPrice = Number(item.price || 0);
                let itemTotal = itemPrice;
                const addons = (item.addons || []).map((a) => {
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
                    itemId: item.itemId,
                    variantId: item.variantId || undefined,
                    name: item.name || "Item",
                    quantity: Number(item.quantity || 1),
                    price: itemPrice,
                    addons,
                };
            });
            const totalAmount = subtotal; // tax/discount omitted for simplicity
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
            const internalCustomerId = processedOrder.canonicalPayload?.customer ? await QRSession.db.model("Customer").findOne({
                tenantId: table.tenantId,
                phone: rawPayload.customer.phone,
                isDeleted: false,
            }) : null;
            const customerObjectId = internalCustomerId ? internalCustomerId._id : null;
            // Update Session
            session.status = "ORDERED";
            if (customerObjectId)
                session.customerId = customerObjectId;
            if (seatNumber)
                session.seatNumber = seatNumber;
            await session.save();
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
            }
            else {
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
            }
            else {
                if (!bill.orderIds.map(id => id.toString()).includes(orderId.toString())) {
                    bill.orderIds.push(orderId);
                    bill.totalAmount += totalAmount;
                }
            }
            await bill.save();
            ApiResponseHandler.success(res, 201, "QR Order placed successfully", processedOrder);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to place QR order");
        }
    }
    /**
     * POST /api/public/qr/assist
     * Dispatches operational notification alerts for a table via outbox events
     */
    static async requestQrAssistance(req, res) {
        try {
            const { tableToken, action, seatNumber } = req.body;
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
            // 2. Resolve or create active session
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
                // Update table operational status to OCCUPIED
                table.operationalStatus = "OCCUPIED";
                await table.save();
                // Publish table occupied event
                await EventBusService.publishTableOccupied(table.tenantId, table.outletId, table._id, {
                    tableId: table._id.toString(),
                    tableNumber: table.tableNumber,
                    status: table.operationalStatus,
                    updatedAt: new Date()
                }, { correlationId: session.sessionToken });
            }
            // 3. Construct event payload and publish QR_ASSISTANCE_REQUESTED outbox event
            const actionText = String(action).toUpperCase();
            const payload = {
                tenantId: table.tenantId.toString(),
                outletId: table.outletId.toString(),
                tableId: table._id.toString(),
                sessionId: session._id.toString(),
                assistanceType: actionText,
                seatNumber: seatNumber || null,
                createdAt: new Date()
            };
            await EventBusService.publishQRAssistanceRequested(table.tenantId, table.outletId, table._id, payload, { correlationId: session.sessionToken });
            ApiResponseHandler.success(res, 200, "Assistance request queued successfully", {
                tableNumber: table.tableNumber,
                action: actionText,
                seatNumber: seatNumber || null,
                sessionId: session._id.toString()
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to request assistance");
        }
    }
    /**
     * GET /api/public/o/:outletSlug/categories
     * Retrieves active categories for an outlet
     */
    static async getPublicCategories(req, res) {
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve categories");
        }
    }
    /**
     * GET /api/public/o/:outletSlug/menu/:itemId
     * Retrieves a menu item, its active variants, and active addons
     */
    static async getPublicMenuItem(req, res) {
        try {
            const { outletSlug, itemId } = req.params;
            const outlet = await Outlet.findOne({ slug: outletSlug, isDeleted: false });
            if (!outlet) {
                ApiResponseHandler.notFound(res, "Outlet not found");
                return;
            }
            const menuItem = await MenuItem.findOne({
                _id: new Types.ObjectId(itemId),
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve menu item details");
        }
    }
    /**
     * GET /api/public/cart
     * Retrieves the active cart associated with the session token
     */
    static async getCart(req, res) {
        try {
            const sessionToken = req.headers["x-session-token"];
            if (!sessionToken) {
                ApiResponseHandler.badRequest(res, "Session token is required");
                return;
            }
            const cart = await Cart.findOne({
                sessionToken: String(sessionToken),
                status: "ACTIVE",
                isDeleted: false,
            });
            ApiResponseHandler.success(res, 200, "Cart retrieved successfully", cart || { items: [] });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve cart");
        }
    }
    /**
     * POST /api/public/cart
     * Creates or updates a cart, enforcing single-outlet cart rules and updating ChannelSession funnel metrics
     */
    static async createOrUpdateCart(req, res) {
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
            }
            else {
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
            }
            else {
                // Enforce single-outlet cart rules on existing cart
                if (cart.outletId.toString() !== outletId.toString()) {
                    ApiResponseHandler.badRequest(res, "Cart already contains items from another outlet. Cross-outlet ordering is rejected.");
                    return;
                }
            }
            const activeCart = cart;
            // Parse item properties
            const menuItemId = new Types.ObjectId(item.menuItemId);
            const variantId = item.variantId ? new Types.ObjectId(item.variantId) : null;
            const addons = (item.addons || []).map((a) => ({
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
                if (!matchMenuItem || !matchVariant)
                    return false;
                if (cartItem.addons.length !== addons.length)
                    return false;
                return addons.every((newAddon) => cartItem.addons.some((existingAddon) => existingAddon.addonId.toString() === newAddon.addonId.toString() &&
                    existingAddon.quantity === newAddon.quantity));
            });
            if (existingItemIndex > -1) {
                const existingItem = activeCart.items[existingItemIndex];
                if (existingItem) {
                    existingItem.quantity += quantity;
                    if (notes)
                        existingItem.notes = notes;
                }
            }
            else {
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
            }
            else {
                await EventBusService.publishCartUpdated(activeCart.tenantId, activeCart.outletId, activeCart._id, activeCart, {
                    correlationId: session.sessionToken,
                    sourceSystem: "WEBSITE",
                }).catch(err => console.error("Failed to publish CART_UPDATED event:", err));
            }
            ApiResponseHandler.success(res, 200, "Cart updated successfully", activeCart);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to update cart");
        }
    }
    /**
     * PATCH /api/public/cart/:id
     * Updates quantities or notes of cart items
     */
    static async updateCart(req, res) {
        try {
            const { id } = req.params;
            const { item } = req.body;
            if (!item || !item.menuItemId || item.quantity === undefined) {
                ApiResponseHandler.badRequest(res, "menuItemId and quantity are required");
                return;
            }
            const cart = await Cart.findOne({
                _id: new Types.ObjectId(id),
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
            const itemIndex = cart.items.findIndex((cartItem) => cartItem.menuItemId.toString() === menuItemId.toString() &&
                ((!cartItem.variantId && !variantId) || cartItem.variantId?.toString() === variantId?.toString()));
            if (itemIndex === -1) {
                ApiResponseHandler.notFound(res, "Item not found in cart");
                return;
            }
            if (quantity <= 0) {
                cart.items.splice(itemIndex, 1);
            }
            else {
                const cartItem = cart.items[itemIndex];
                if (cartItem) {
                    cartItem.quantity = quantity;
                    if (item.notes !== undefined)
                        cartItem.notes = item.notes;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to update cart");
        }
    }
    /**
     * DELETE /api/public/cart/:id/items/:itemId
     * Removes item from cart
     */
    static async removeFromCart(req, res) {
        try {
            const { id, itemId } = req.params;
            const variantId = req.query.variantId || null;
            const cart = await Cart.findOne({
                _id: new Types.ObjectId(id),
                status: "ACTIVE",
                isDeleted: false,
            });
            if (!cart) {
                ApiResponseHandler.notFound(res, "Active cart not found");
                return;
            }
            const itemIndex = cart.items.findIndex((cartItem) => cartItem.menuItemId.toString() === itemId &&
                ((!cartItem.variantId && !variantId) || cartItem.variantId?.toString() === variantId?.toString()));
            if (itemIndex === -1) {
                ApiResponseHandler.notFound(res, "Item not found in cart");
                return;
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
            ApiResponseHandler.success(res, 200, "Item removed from cart successfully", cart);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to remove item from cart");
        }
    }
    /**
     * POST /api/public/customer/address
     * Creates a customer address standalone record
     */
    static async createCustomerAddress(req, res) {
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to save address");
        }
    }
    /**
     * POST /api/public/checkout
     * Checkout endpoint converting cart to CanonicalOrder, executing ingestion, and creating timeline/checkout session
     */
    static async checkoutCart(req, res) {
        try {
            const { cartId, customer, fulfillment, payment } = req.body;
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
            const discount = 0; // promotions handled in Phase 8C
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
            ApiResponseHandler.success(res, 201, "Website Checkout completed successfully", {
                processedOrder,
                checkoutSession,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to complete checkout");
        }
    }
    /**
     * GET /api/public/orders/track/:orderId
     * Retrieves live timeline history querying OrderTimeline collection
     */
    static async trackOrder(req, res) {
        try {
            const { orderId } = req.params;
            if (!orderId || !Types.ObjectId.isValid(orderId)) {
                ApiResponseHandler.badRequest(res, "A valid orderId parameter is required");
                return;
            }
            // Fetch order details
            const order = await Order.findOne({
                _id: new Types.ObjectId(orderId),
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve tracking details");
        }
    }
    /**
     * POST /api/public/cart/reorder
     * Reorders a previous order by validating item availability and rebuilding the cart with current pricing.
     */
    static async reorderToCart(req, res) {
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
            }
            else {
                // Enforce outlet isolation: cart must belong to same outlet as the previous order
                if (cart.outletId.toString() !== order.outletId.toString()) {
                    ApiResponseHandler.badRequest(res, "Cart contains items from another outlet. Reordering from a different outlet is rejected.");
                    return;
                }
            }
            const warnings = [];
            const activeCart = cart;
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
                let variantId = null;
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
                    variantId = variant._id;
                }
                // Revalidate Addons
                const validatedAddons = [];
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
                        addonId: addon._id,
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
                    if (!matchMenuItem || !matchVariant)
                        return false;
                    if (cartItem.addons.length !== validatedAddons.length)
                        return false;
                    return validatedAddons.every((newAddon) => cartItem.addons.some((existingAddon) => existingAddon.addonId.toString() === newAddon.addonId.toString()));
                });
                if (existingItemIndex > -1) {
                    const cartItem = activeCart.items[existingItemIndex];
                    if (cartItem) {
                        cartItem.quantity += orderItem.quantity;
                    }
                }
                else {
                    activeCart.items.push({
                        menuItemId: menuItem._id,
                        variantId,
                        addons: validatedAddons,
                        quantity: orderItem.quantity,
                        notes: orderItem.notes || null,
                    });
                }
            }
            if (activeCart.items.length === 0) {
                ApiResponseHandler.badRequest(res, "None of the items from the previous order are currently available. Reorder failed.");
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to process reorder");
        }
    }
}
