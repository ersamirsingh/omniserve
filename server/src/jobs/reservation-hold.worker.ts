import Reservation from "../models/reservation.model.js";
import { TableService } from "../modules/outlet/table.service.js";
import Table from "../models/table.model.js";
import QRSession from "../models/qrsession.model.js";
import Order from "../models/order.model.js";
import TableLock from "../models/tableLock.model.js";
import { EventBusService } from "../events/eventBus.js";

async function checkExpiredTableLocks() {
  try {
    const now = new Date();

    // 1. Process expired locks explicitly
    const expiredLocks = await TableLock.find({ expiresAt: { $lte: now } });
    for (const lock of expiredLocks) {
      const table = await Table.findById(lock.tableId);
      if (table && !["AVAILABLE", "RESERVED", "CLEANING"].includes(table.operationalStatus)) {
        if (table.activeSessionId) {
          const session = await QRSession.findById(table.activeSessionId);
          if (session) {
            // Count active orders (exclude cancelled ones)
            const ordersCount = await Order.countDocuments({
              "diningContext.sessionId": session._id,
              status: { $ne: "CANCELLED" }
            });

            if (ordersCount === 0) {
              // Close session
              session.status = "EXPIRED";
              session.closedAt = now;
              await session.save();

              // Free table
              table.activeSessionId = null;
              table.operationalStatus = "AVAILABLE";
              await table.save();

              // Broadcast event
              await EventBusService.publishTableAvailable(
                table.tenantId,
                table.outletId,
                table._id,
                {
                  tableId: table._id.toString(),
                  tableNumber: table.tableNumber,
                  status: "AVAILABLE",
                  updatedAt: now
                },
                { sourceSystem: "SYSTEM" }
              );
            }
          } else {
            // Active session record doesn't exist, just free table
            table.activeSessionId = null;
            table.operationalStatus = "AVAILABLE";
            await table.save();

            await EventBusService.publishTableAvailable(
              table.tenantId,
              table.outletId,
              table._id,
              {
                tableId: table._id.toString(),
                tableNumber: table.tableNumber,
                status: "AVAILABLE",
                updatedAt: now
              },
              { sourceSystem: "SYSTEM" }
            );
          }
        } else {
          // No active session, just free table
          table.operationalStatus = "AVAILABLE";
          await table.save();

          await EventBusService.publishTableAvailable(
            table.tenantId,
            table.outletId,
            table._id,
            {
              tableId: table._id.toString(),
              tableNumber: table.tableNumber,
              status: "AVAILABLE",
              updatedAt: now
            },
            { sourceSystem: "SYSTEM" }
          );
        }
      }
      // Delete the expired lock
      await TableLock.deleteOne({ _id: lock._id });
    }

    // 2. Process tables that are occupied but have no TableLock document in DB
    const occupiedTables = await Table.find({
      operationalStatus: { $in: ["OCCUPIED", "ORDERING"] },
      activeSessionId: { $ne: null }
    });

    for (const table of occupiedTables) {
      const lockExists = await TableLock.findOne({ tableId: table._id });
      if (!lockExists) {
        // No lock exists in DB (meaning it expired and was deleted by TTL, or was never created)
        const session = await QRSession.findById(table.activeSessionId);
        if (session) {
          // If the session was created more than 5 minutes ago, check if we should expire it
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          if (session.openedAt <= fiveMinutesAgo) {
            const ordersCount = await Order.countDocuments({
              "diningContext.sessionId": session._id,
              status: { $ne: "CANCELLED" }
            });

            if (ordersCount === 0) {
              session.status = "EXPIRED";
              session.closedAt = now;
              await session.save();

              table.activeSessionId = null;
              table.operationalStatus = "AVAILABLE";
              await table.save();

              await EventBusService.publishTableAvailable(
                table.tenantId,
                table.outletId,
                table._id,
                {
                  tableId: table._id.toString(),
                  tableNumber: table.tableNumber,
                  status: "AVAILABLE",
                  updatedAt: now
                },
                { sourceSystem: "SYSTEM" }
              );
            }
          }
        } else {
          // Session is missing, free table
          table.activeSessionId = null;
          table.operationalStatus = "AVAILABLE";
          await table.save();

          await EventBusService.publishTableAvailable(
            table.tenantId,
            table.outletId,
            table._id,
            {
              tableId: table._id.toString(),
              tableNumber: table.tableNumber,
              status: "AVAILABLE",
              updatedAt: now
            },
            { sourceSystem: "SYSTEM" }
          );
        }
      }
    }
  } catch (error) {
    console.error("[TableLockWorker] Error sweeping expired table locks:", error);
  }
}

export function startReservationHoldWorker() {
  // Check expired table locks every 10 seconds
  setInterval(checkExpiredTableLocks, 10 * 1000);

  setInterval(async () => {
    try {
      const now = new Date();
      const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      // Find all CONFIRMED reservations starting within the next 15 minutes
      const impendingReservations = await Reservation.find({
        status: "CONFIRMED",
        scheduledAt: { $lte: fifteenMinsFromNow },
        isDeleted: false,
        tableId: { $ne: null }
      });

      for (const res of impendingReservations) {
        if (!res.tableId) continue;
        
        // Update reservation to HOLD
        res.status = "HOLD";
        await res.save();

        // Update table to RESERVED
        await TableService.updateTableOperationalStatus(
          res.tenantId.toString(),
          res.outletId.toString(),
          res.tableId.toString(),
          "RESERVED",
          { correlationId: res._id.toString() }
        );
      }
    } catch (error) {
      console.error("[ReservationHoldWorker] Error checking hold windows:", error);
    }
  }, 60 * 1000); // Run every minute
}
