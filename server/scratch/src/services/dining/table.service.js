import { Types } from "mongoose";
import Table from "../../models/table.model.js";
import { EventBusService } from "../event-bus.service.js";
export class TableService {
    /**
     * Retrieve table by ID
     */
    static async getTableById(tableId) {
        return await Table.findOne({ _id: new Types.ObjectId(tableId), isDeleted: false });
    }
    /**
     * Update table operational status and publish status events
     */
    static async updateTableOperationalStatus(tenantId, outletId, tableId, status, options = {}) {
        const table = await Table.findOneAndUpdate({ _id: new Types.ObjectId(tableId), tenantId: new Types.ObjectId(tenantId), isDeleted: false }, { $set: { operationalStatus: status } }, { new: true });
        if (!table) {
            throw new Error(`Table not found: ${tableId}`);
        }
        // Publish event depending on the status transition
        const payload = {
            tableId: table._id.toString(),
            tableNumber: table.tableNumber,
            status: table.operationalStatus,
            updatedAt: new Date()
        };
        const publishOpts = {
            correlationId: options.correlationId,
            createdBy: options.triggeredById,
            sourceSystem: "SYSTEM"
        };
        if (status === "OCCUPIED") {
            await EventBusService.publishTableOccupied(tenantId, outletId, tableId, payload, publishOpts);
        }
        else if (status === "AVAILABLE") {
            await EventBusService.publishTableAvailable(tenantId, outletId, tableId, payload, publishOpts);
        }
        else if (status === "RESERVED") {
            await EventBusService.publishTableReserved(tenantId, outletId, tableId, payload, publishOpts);
        }
        else if (status === "CLEANING") {
            await EventBusService.publishTableCleaningStarted(tenantId, outletId, tableId, payload, publishOpts);
        }
        else {
            await EventBusService.publishTableStatusChanged(tenantId, outletId, tableId, payload, publishOpts);
        }
        return table;
    }
    /**
     * List tables by physical outlet
     */
    static async listTablesByOutlet(tenantId, outletId) {
        return await Table.find({
            tenantId: new Types.ObjectId(tenantId),
            outletId: new Types.ObjectId(outletId),
            isDeleted: false
        }).sort({ tableNumber: 1 });
    }
}
