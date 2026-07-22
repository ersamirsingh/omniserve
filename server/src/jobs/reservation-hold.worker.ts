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

    const expiredLocks = await TableLock.find({ expiresAt: { $lte: now } });
    for (const lock of expiredLocks) {
      const table = await Table.findById(lock.tableId);
      if (table) {
        if (table.activeSessionId) {
          const session = await QRSession.findById(table.activeSessionId);
          if (session) {

            const ordersCount = await Order.countDocuments({
              "diningContext.sessionId": session._id,
              orderStatus: { $ne: "CANCELLED" }
            });

            if (ordersCount === 0) {

              session.status = "EXPIRED";
              session.closedAt = now;
              await session.save();

              const statusChanged = !["AVAILABLE", "RESERVED", "CLEANING"].includes(table.operationalStatus);
              table.activeSessionId = null;
              if (statusChanged) {
                table.operationalStatus = "AVAILABLE";
              }
              await table.save();

              if (statusChanged) {

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

      await TableLock.deleteOne({ _id: lock._id });
    }

    const occupiedTables = await Table.find({
      operationalStatus: { $in: ["OCCUPIED", "ORDERING"] },
      activeSessionId: { $ne: null }
    });

    if (occupiedTables.length > 0) {
      const tableIds = occupiedTables.map(t => t._id);
      const activeLocks = await TableLock.find({ tableId: { $in: tableIds } }, 'tableId').lean();
      const lockedTableIdSet = new Set(activeLocks.map(l => l.tableId.toString()));

      for (const table of occupiedTables) {
        if (!lockedTableIdSet.has(table._id.toString())) {

          const session = await QRSession.findById(table.activeSessionId);
          if (session) {

            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            if (session.openedAt <= fiveMinutesAgo) {
              const ordersCount = await Order.countDocuments({
                "diningContext.sessionId": session._id,
                orderStatus: { $ne: "CANCELLED" }
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
    }
  } catch (error) {
    console.error("[TableLockWorker] Error sweeping expired table locks:", error);
  }
}

export function startReservationHoldWorker() {

  setInterval(checkExpiredTableLocks, 10 * 1000);

  setInterval(async () => {
    try {
      const now = new Date();
      const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      const impendingReservations = await Reservation.find({
        status: "CONFIRMED",
        scheduledAt: { $lte: fifteenMinsFromNow },
        isDeleted: false,
        tableId: { $ne: null }
      });

      for (const res of impendingReservations) {
        if (!res.tableId) continue;

        const updatedRes = await Reservation.findOneAndUpdate(
          { _id: res._id, status: "CONFIRMED" },
          { $set: { status: "HOLD" } },
          { new: true }
        );

        if (updatedRes) {

          await TableService.updateTableOperationalStatus(
            res.tenantId.toString(),
            res.outletId.toString(),
            res.tableId.toString(),
            "RESERVED",
            { correlationId: res._id.toString() }
          );
        }
      }
    } catch (error) {
      console.error("[ReservationHoldWorker] Error checking hold windows:", error);
    }
  }, 60 * 1000);
}
