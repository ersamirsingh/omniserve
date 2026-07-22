import { Types } from 'mongoose';
import { QdrantService } from '../services/qdrant.service.js';
import { LlmService } from '../services/llm.service.js';
import * as Models from '../../../models/index.js';
import SyncJob from '../../../models/syncjob.model.js';
import IntegrationEvent from '../../../models/integrationevent.model.js';
import Reservation from '../../../models/reservation.model.js';

interface IModelVectorConfig {
  model: any;
  entityType: string;
  extractText: (doc: any) => string | null;
  extractMetadata: (doc: any) => {
    tenantId?: string;
    outletId?: string | null;
    [key: string]: any;
  };
}

const VECTOR_SYNC_CONFIGS: IModelVectorConfig[] = [
  {
    model: Models.MenuItem,
    entityType: 'MenuItem',
    extractText: (doc) => {
      if (!doc.name) return null;
      return `Menu Item: ${doc.name}. Description: ${doc.description || 'No description available'}. Price: $${doc.price}. Category ID: ${doc.categoryId}. ${doc.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}. ${doc.isAvailable ? 'Available' : 'Currently Unavailable'}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString(),
      outletId: doc.outletId?.toString() || null,
      price: doc.price,
      isVeg: doc.isVeg,
      isAvailable: doc.isAvailable,
    }),
  },
  {
    model: Models.ReviewAnalytics,
    entityType: 'ReviewAnalytics',
    extractText: (doc) => {
      if (!doc.reviewText) return null;
      return `Customer Review for Outlet ${doc.outletId}: "${doc.reviewText}". Rating: ${doc.rating || 'N/A'}. Sentiment: ${doc.sentiment || 'N/A'}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString(),
      outletId: doc.outletId?.toString() || null,
      rating: doc.rating,
      sentiment: doc.sentiment,
    }),
  },
  {
    model: Models.Order,
    entityType: 'Order',
    extractText: (doc) => {
      if (!doc.notes) return null;
      return `Order Note for Order #${doc.orderNumber || doc._id}: "${doc.notes}". Order Status: ${doc.orderStatus}. Total: $${doc.totalAmount}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString(),
      outletId: doc.outletId?.toString() || null,
      orderStatus: doc.orderStatus,
    }),
  },
  {
    model: Models.AuditLog,
    entityType: 'AuditLog',
    extractText: (doc) => {
      if (!doc.action) return null;
      return `Audit Action: ${doc.action} on Entity: ${doc.entityType} (ID: ${doc.entityId}). Performed by User: ${doc.userId}. IP: ${doc.ipAddress || 'Unknown'}. New Data: ${doc.newData ? JSON.stringify(doc.newData) : 'None'}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString() || undefined,
      action: doc.action,
      entityType: doc.entityType,
    }),
  },
  {
    model: Models.WebhookLog,
    entityType: 'WebhookLog',
    extractText: (doc) => {
      if (!doc.event) return null;
      return `Webhook Event: ${doc.event}. Provider: ${doc.provider}. Status: ${doc.statusCode}. Error: ${doc.errorMessage || 'None'}. Payload: ${doc.payload ? JSON.stringify(doc.payload) : ''}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString() || undefined,
      event: doc.event,
      statusCode: doc.statusCode,
    }),
  },
  {
    model: SyncJob,
    entityType: 'SyncJob',
    extractText: (doc) => {
      if (!doc.provider) return null;
      return `Sync Job for Provider: ${doc.provider}. Status: ${doc.status}. Triggered by: ${doc.triggerType}. Records Processed: ${doc.recordsProcessed || 0}. Errors: ${doc.errorDetails ? JSON.stringify(doc.errorDetails) : 'None'}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString() || undefined,
      provider: doc.provider,
      status: doc.status,
    }),
  },
  {
    model: IntegrationEvent,
    entityType: 'IntegrationEvent',
    extractText: (doc) => {
      if (!doc.eventType) return null;
      return `Integration Event: ${doc.eventType}. Provider: ${doc.provider}. Direction: ${doc.direction}. Payload details: ${doc.payload ? JSON.stringify(doc.payload) : ''}. Error message: ${doc.error || 'None'}.`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString() || undefined,
      provider: doc.provider,
      eventType: doc.eventType,
    }),
  },
  {
    model: Reservation,
    entityType: 'Reservation',
    extractText: (doc) => {
      if (!doc.specialRequests) return null;
      return `Reservation Special Requests for Guest: ${doc.customerName || 'N/A'} (Party of ${doc.guestCount}): "${doc.specialRequests}".`;
    },
    extractMetadata: (doc) => ({
      tenantId: doc.tenantId?.toString(),
      outletId: doc.outletId?.toString() || null,
    }),
  },
];

export class VectorSyncService {

  static async syncAll(lastSyncTime: Date): Promise<number> {
    let totalSynced = 0;

    await QdrantService.ensureCollection();

    for (const config of VECTOR_SYNC_CONFIGS) {
      try {

        const docs = await config.model.find({
          updatedAt: { $gt: lastSyncTime },
        });

        if (docs.length === 0) continue;

        const points: any[] = [];

        for (const doc of docs) {
          const text = config.extractText(doc);
          if (!text) continue;

          const vector = await LlmService.getEmbedding(text);

          const baseMetadata = config.extractMetadata(doc);
          const payload = {
            ...baseMetadata,
            text,
            entityType: config.entityType,
            entityId: doc._id.toString(),
            createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
          };

          const pointId = this.generateUuidFromObjectId(doc._id);

          points.push({
            id: pointId,
            vector,
            payload,
          });
        }

        if (points.length > 0) {
          await QdrantService.upsertDocuments(points);
          totalSynced += points.length;
        }
      } catch (error: any) {
        console.error(`[VectorSyncService] Error syncing model ${config.entityType}:`, error.message);
      }
    }

    return totalSynced;
  }

  private static generateUuidFromObjectId(objectId: Types.ObjectId | string): string {
    const hex = objectId.toString();

    const padded = hex.padEnd(32, '0');
    return `${padded.substring(0, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}-${padded.substring(16, 20)}-${padded.substring(20, 32)}`;
  }
}
