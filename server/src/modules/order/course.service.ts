import { Types } from "mongoose";
import OrderItem from "../../models/orderItem.model.js";
import Order from "../../models/order.model.js";
import { EventBusService } from "../../events/eventBus.js";

export type CourseType = "IMMEDIATE" | "STARTERS" | "MAINS" | "DESSERTS";
export type KdsStation = "HOT" | "COLD" | "BAR" | "GRILL" | "SALAD" | "PASTRY" | "GENERAL";

export interface IFireItemResult {
  success: boolean;
  itemId: string;
  itemName: string;
  course: string;
  kdsStation: string | null;
  firedAt: Date;
}

export interface IHoldItemResult {
  success: boolean;
  itemId: string;
  itemName: string;
  course: string;
}

export interface IFireCourseResult {
  success: boolean;
  course: string;
  firedItems: IFireItemResult[];
  totalFired: number;
}

export interface IKdsQueueItem {
  itemId: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  quantity: number;
  course: string;
  holdStatus: string;
  kdsStation: string | null;
  firedAt: Date | null;
  notes: string | null;
  sessionId: string | null;
  tableNumber: string | null;
  seatNumber: string | null;
}

export class CourseService {
  /**
   * Hold a specific order item — marks it as HELD so it will not be sent to KDS
   * until explicitly fired. Publishes ITEM_HELD event.
   */
  static async holdItem(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    itemId: string,
    firedBy?: Types.ObjectId
  ): Promise<IHoldItemResult> {
    const item = await OrderItem.findOne({
      _id: new Types.ObjectId(itemId),
      tenantId,
      isDeleted: false
    });

    if (!item) throw new Error(`Order item ${itemId} not found`);

    if (item.holdStatus === "FIRED") {
      throw new Error(`Item "${item.name}" has already been fired to KDS and cannot be held`);
    }

    const prevStatus = item.holdStatus;
    item.holdStatus = "HELD";
    await item.save();

    // Fetch parent order for session context
    const order = await Order.findById(item.orderId).lean();

    await EventBusService.publishItemHeld(
      tenantId,
      outletId,
      item._id,
      {
        itemId: item._id.toString(),
        orderId: item.orderId.toString(),
        sessionId: (order?.diningContext?.sessionId ?? null)?.toString(),
        tableId: (order?.diningContext?.tableId ?? null)?.toString(),
        itemName: item.name,
        course: item.course,
        previousStatus: prevStatus,
        heldBy: firedBy?.toString()
      },
      { createdBy: firedBy, sourceSystem: "SYSTEM" }
    );

    return {
      success: true,
      itemId: item._id.toString(),
      itemName: item.name,
      course: item.course
    };
  }

  /**
   * Fire a specific order item — marks it as FIRED and sends it to the KDS.
   * Publishes ITEM_FIRED + ITEM_FIRE_REQUESTED events.
   */
  static async fireItem(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    itemId: string,
    kdsStation?: KdsStation,
    firedBy?: Types.ObjectId
  ): Promise<IFireItemResult> {
    const item = await OrderItem.findOne({
      _id: new Types.ObjectId(itemId),
      tenantId,
      isDeleted: false
    });

    if (!item) throw new Error(`Order item ${itemId} not found`);

    if (item.holdStatus === "FIRED") {
      throw new Error(`Item "${item.name}" has already been fired to KDS`);
    }

    const firedAt = new Date();
    item.holdStatus = "FIRED";
    item.firedAt = firedAt;
    if (kdsStation) {
      item.kdsStation = kdsStation;
    }
    await item.save();

    // Fetch parent order for session context
    const order = await Order.findById(item.orderId).lean();

    const eventPayload = {
      itemId: item._id.toString(),
      orderId: item.orderId.toString(),
      sessionId: (order?.diningContext?.sessionId ?? null)?.toString(),
      tableId: (order?.diningContext?.tableId ?? null)?.toString(),
      itemName: item.name,
      quantity: item.quantity,
      course: item.course,
      kdsStation: item.kdsStation ?? null,
      firedAt,
      firedBy: firedBy?.toString(),
      notes: item.notes ?? null
    };

    // Publish ITEM_FIRED for realtime broadcast
    await EventBusService.publishItemFired(
      tenantId,
      outletId,
      item._id,
      eventPayload,
      { createdBy: firedBy, sourceSystem: "SYSTEM" }
    );

    // Publish ITEM_FIRE_REQUESTED for KDS workflow processing
    await EventBusService.publishItemFireRequested(
      tenantId,
      outletId,
      item.orderId,
      eventPayload,
      { createdBy: firedBy, sourceSystem: "SYSTEM" }
    );

    return {
      success: true,
      itemId: item._id.toString(),
      itemName: item.name,
      course: item.course,
      kdsStation: item.kdsStation ?? null,
      firedAt
    };
  }

  /**
   * Fire all HELD items for a specific course on an order.
   * Publishes individual ITEM_FIRED events + a batch COURSE_FIRED event.
   */
  static async fireCourse(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    orderId: string,
    course: CourseType,
    kdsStation?: KdsStation,
    firedBy?: Types.ObjectId
  ): Promise<IFireCourseResult> {
    const heldItems = await OrderItem.find({
      orderId: new Types.ObjectId(orderId),
      tenantId,
      course,
      holdStatus: { $in: ["HELD", "FIRE_REQUESTED"] },
      isDeleted: false
    });

    if (heldItems.length === 0) {
      throw new Error(`No held items found for course "${course}" on order ${orderId}`);
    }

    const firedAt = new Date();
    const firedResults: IFireItemResult[] = [];
    const firedItemIds: string[] = [];

    for (const item of heldItems) {
      item.holdStatus = "FIRED";
      item.firedAt = firedAt;
      if (kdsStation) {
        item.kdsStation = kdsStation;
      }
      await item.save();
      firedItemIds.push(item._id.toString());
      firedResults.push({
        success: true,
        itemId: item._id.toString(),
        itemName: item.name,
        course: item.course,
        kdsStation: item.kdsStation ?? null,
        firedAt
      });
    }

    // Fetch parent order for session context
    const order = await Order.findById(new Types.ObjectId(orderId)).lean();

    const courseBatchPayload = {
      orderId,
      sessionId: (order?.diningContext?.sessionId ?? null)?.toString(),
      tableId: (order?.diningContext?.tableId ?? null)?.toString(),
      course,
      itemIds: firedItemIds,
      firedAt,
      firedBy: firedBy?.toString()
    };

    // Publish COURSE_FIRED batch event
    await EventBusService.publishCourseFired(
      tenantId,
      outletId,
      new Types.ObjectId(orderId),
      courseBatchPayload,
      { createdBy: firedBy, sourceSystem: "SYSTEM" }
    );

    // Also publish ITEM_FIRE_REQUESTED for each item for KDS routing
    for (const item of heldItems) {
      const eventPayload = {
        itemId: item._id.toString(),
        orderId,
        sessionId: (order?.diningContext?.sessionId ?? null)?.toString(),
        tableId: (order?.diningContext?.tableId ?? null)?.toString(),
        itemName: item.name,
        quantity: item.quantity,
        course: item.course,
        kdsStation: item.kdsStation ?? null,
        firedAt,
        firedBy: firedBy?.toString(),
        notes: item.notes ?? null,
        batchCourseFire: true
      };

      await EventBusService.publishItemFireRequested(
        tenantId,
        outletId,
        item.orderId,
        eventPayload,
        { createdBy: firedBy, sourceSystem: "SYSTEM" }
      ).catch((err: any) => {
        // Swallow deduplication errors on batch fires — items may share correlationIds
        if (err?.code !== 11000) throw err;
      });
    }

    return {
      success: true,
      course,
      firedItems: firedResults,
      totalFired: firedResults.length
    };
  }

  /**
   * Get the KDS queue — returns all HELD/FIRE_REQUESTED items for an outlet,
   * optionally filtered by course or KDS station.
   */
  static async getKdsQueue(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    filters: {
      course?: CourseType;
      kdsStation?: KdsStation;
      holdStatus?: "HELD" | "FIRE_REQUESTED" | "FIRED";
    } = {}
  ): Promise<IKdsQueueItem[]> {
    const query: Record<string, any> = {
      tenantId,
      isDeleted: false
    };

    if (filters.holdStatus) {
      query.holdStatus = filters.holdStatus;
    } else {
      // Default: show all items active in KDS queue
      query.holdStatus = { $in: ["HELD", "FIRE_REQUESTED", "FIRED"] };
    }

    if (filters.course) {
      query.course = filters.course;
    }

    if (filters.kdsStation) {
      query.kdsStation = filters.kdsStation;
    }

    const items = await OrderItem.find(query).lean();

    // Group by orderId and batch-fetch orders for context
    const orderIds = [...new Set(items.map(i => i.orderId.toString()))];
    const orders = await Order.find({
      _id: { $in: orderIds.map(id => new Types.ObjectId(id)) },
      outletId,
      isDeleted: false
    }).lean();

    const orderMap = new Map(orders.map(o => [o._id.toString(), o]));

    const result: IKdsQueueItem[] = items
      .filter(item => orderMap.has(item.orderId.toString())) // only items for this outlet
      .map(item => {
        const order = orderMap.get(item.orderId.toString());
        return {
          itemId: item._id.toString(),
          orderId: item.orderId.toString(),
          orderNumber: order?.orderNumber ?? "UNKNOWN",
          itemName: item.name,
          quantity: item.quantity,
          course: item.course,
          holdStatus: item.holdStatus,
          kdsStation: item.kdsStation ?? null,
          firedAt: item.firedAt ?? null,
          notes: item.notes ?? null,
          sessionId: (order?.diningContext?.sessionId ?? null)?.toString() ?? null,
          tableNumber: order?.diningContext?.tableNumber ?? null,
          seatNumber: order?.diningContext?.seatNumber ?? null
        };
      });

    // Sort: FIRE_REQUESTED first, then HELD, then by creation time
    result.sort((a, b) => {
      const priority: Record<string, number> = { FIRE_REQUESTED: 0, HELD: 1, FIRED: 2 };
      const diff = (priority[a.holdStatus] ?? 2) - (priority[b.holdStatus] ?? 2);
      return diff !== 0 ? diff : 0;
    });

    return result;
  }

  /**
   * Update the KDS station assignment for an item (e.g. reroute to different kitchen station)
   */
  static async updateKdsStation(
    tenantId: Types.ObjectId,
    itemId: string,
    kdsStation: KdsStation
  ): Promise<void> {
    const item = await OrderItem.findOne({
      _id: new Types.ObjectId(itemId),
      tenantId,
      isDeleted: false
    });

    if (!item) throw new Error(`Order item ${itemId} not found`);

    item.kdsStation = kdsStation;
    await item.save();
  }
}
