import Reservation from "../models/reservation.model.js";
import { TableService } from "../modules/outlet/table.service.js";

export function startReservationHoldWorker() {
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
