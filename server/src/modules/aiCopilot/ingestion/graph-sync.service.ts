import { Neo4jService, INeo4jWriteQuery } from '../services/neo4j.service.js';
import * as Models from '../../../models/index.js';
import ChannelConnection from '../../../models/channelconnection.model.js';
import ChannelOutletMapping from '../../../models/channeloutletmapping.model.js';
import ChannelMenuItemMapping from '../../../models/channelmenuitemmapping.model.js';
import ExternalOrder from '../../../models/externalorder.model.js';

export class GraphSyncService {
  /**
   * Syncs database relationships and nodes modified since lastSyncTime into Neo4j.
   * @param {Date} lastSyncTime - Sync records updated after this date
   */
  static async syncAll(lastSyncTime: Date): Promise<number> {
    let txCount = 0;
    const queries: INeo4jWriteQuery[] = [];

    try {
      // 1. Sync Tenants
      const tenants = await Models.Tenant.find({ updatedAt: { $gt: lastSyncTime } });
      for (const t of tenants) {
        queries.push({
          query: `
            MERGE (n:Tenant {id: $id})
            ON CREATE SET n.name = $name, n.createdAt = $createdAt, n.updatedAt = $updatedAt
            ON MATCH SET n.name = $name, n.updatedAt = $updatedAt
          `,
          params: {
            id: t._id.toString(),
            name: t.name || 'Unknown Tenant',
            createdAt: t.createdAt?.toISOString(),
            updatedAt: t.updatedAt?.toISOString(),
          },
        });
      }

      // 2. Sync Restaurants
      const restaurants = await Models.Restaurant.find({ updatedAt: { $gt: lastSyncTime } });
      for (const r of restaurants) {
        queries.push(
          {
            query: `
              MERGE (n:Restaurant {id: $id})
              ON CREATE SET n.name = $name, n.tenantId = $tenantId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.name = $name, n.tenantId = $tenantId, n.updatedAt = $updatedAt
            `,
            params: {
              id: r._id.toString(),
              name: r.name,
              tenantId: r.tenantId?.toString(),
              createdAt: r.createdAt?.toISOString(),
              updatedAt: r.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (n:Restaurant {id: $id})
              MATCH (t:Tenant {id: $tenantId})
              MERGE (n)-[:BELONGS_TO]->(t)
            `,
            params: { id: r._id.toString(), tenantId: r.tenantId?.toString() },
          }
        );
      }

      // 3. Sync Outlets
      const outlets = await Models.Outlet.find({ updatedAt: { $gt: lastSyncTime } });
      for (const o of outlets) {
        queries.push(
          {
            query: `
              MERGE (n:Outlet {id: $id})
              ON CREATE SET n.name = $name, n.tenantId = $tenantId, n.restaurantId = $restaurantId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.name = $name, n.tenantId = $tenantId, n.restaurantId = $restaurantId, n.updatedAt = $updatedAt
            `,
            params: {
              id: o._id.toString(),
              name: o.name,
              tenantId: o.tenantId?.toString(),
              restaurantId: o.restaurantId?.toString(),
              createdAt: o.createdAt?.toISOString(),
              updatedAt: o.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (n:Outlet {id: $id})
              MATCH (r:Restaurant {id: $restaurantId})
              MERGE (n)-[:BELONGS_TO]->(r)
            `,
            params: { id: o._id.toString(), restaurantId: o.restaurantId?.toString() },
          }
        );
      }

      // 4. Sync Categories & Menu Items
      const categories = await Models.Category.find({ updatedAt: { $gt: lastSyncTime } });
      for (const c of categories) {
        queries.push(
          {
            query: `
              MERGE (n:Category {id: $id})
              ON CREATE SET n.name = $name, n.tenantId = $tenantId, n.outletId = $outletId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.name = $name, n.tenantId = $tenantId, n.outletId = $outletId, n.updatedAt = $updatedAt
            `,
            params: {
              id: c._id.toString(),
              name: c.name,
              tenantId: c.tenantId?.toString(),
              outletId: c.outletId?.toString(),
              createdAt: c.createdAt?.toISOString(),
              updatedAt: c.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (n:Category {id: $id})
              MATCH (o:Outlet {id: $outletId})
              MERGE (n)-[:BELONGS_TO]->(o)
            `,
            params: { id: c._id.toString(), outletId: c.outletId?.toString() },
          }
        );
      }

      const menuItems = await Models.MenuItem.find({ updatedAt: { $gt: lastSyncTime } });
      for (const m of menuItems) {
        queries.push(
          {
            query: `
              MERGE (n:MenuItem {id: $id})
              ON CREATE SET n.name = $name, n.price = $price, n.tenantId = $tenantId, n.outletId = $outletId, n.isAvailable = $isAvailable, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.name = $name, n.price = $price, n.tenantId = $tenantId, n.outletId = $outletId, n.isAvailable = $isAvailable, n.updatedAt = $updatedAt
            `,
            params: {
              id: m._id.toString(),
              name: m.name,
              price: m.price,
              tenantId: m.tenantId?.toString(),
              outletId: m.outletId?.toString(),
              isAvailable: m.isAvailable,
              createdAt: m.createdAt?.toISOString(),
              updatedAt: m.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (n:MenuItem {id: $id})
              MATCH (c:Category {id: $categoryId})
              MERGE (n)-[:BELONGS_TO]->(c)
            `,
            params: { id: m._id.toString(), categoryId: m.categoryId?.toString() },
          }
        );
      }

      // 5. Sync Orders, Payments & Customers
      const orders = await Models.Order.find({ updatedAt: { $gt: lastSyncTime } });
      for (const ord of orders) {
        queries.push(
          {
            query: `
              MERGE (n:Order {id: $id})
              ON CREATE SET n.orderNumber = $orderNumber, n.orderStatus = $orderStatus, n.paymentStatus = $paymentStatus, n.totalAmount = $totalAmount, n.tenantId = $tenantId, n.outletId = $outletId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.orderStatus = $orderStatus, n.paymentStatus = $paymentStatus, n.totalAmount = $totalAmount, n.updatedAt = $updatedAt
            `,
            params: {
              id: ord._id.toString(),
              orderNumber: ord.orderNumber || ord._id.toString(),
              orderStatus: ord.orderStatus,
              paymentStatus: ord.paymentStatus,
              totalAmount: ord.totalAmount,
              tenantId: ord.tenantId?.toString(),
              outletId: ord.outletId?.toString(),
              createdAt: ord.createdAt?.toISOString(),
              updatedAt: ord.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (n:Order {id: $id})
              MATCH (o:Outlet {id: $outletId})
              MERGE (n)-[:PLACED_AT]->(o)
            `,
            params: { id: ord._id.toString(), outletId: ord.outletId?.toString() },
          }
        );

        if (ord.customerId) {
          queries.push({
            query: `
              MATCH (o:Order {id: $id})
              MERGE (c:Customer {id: $customerId})
              MERGE (o)-[:PLACED_BY]->(c)
            `,
            params: { id: ord._id.toString(), customerId: ord.customerId.toString() },
          });
        }
      }

      // 6. Sync Payments
      const payments = await Models.Payment.find({ updatedAt: { $gt: lastSyncTime } });
      for (const p of payments) {
        queries.push(
          {
            query: `
              MERGE (n:Payment {id: $id})
              ON CREATE SET n.amount = $amount, n.status = $status, n.paymentMethod = $paymentMethod, n.tenantId = $tenantId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.status = $status, n.updatedAt = $updatedAt
            `,
            params: {
              id: p._id.toString(),
              amount: p.amount,
              status: p.status,
              paymentMethod: p.paymentMethod,
              tenantId: p.tenantId?.toString(),
              createdAt: p.createdAt?.toISOString(),
              updatedAt: p.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (p:Payment {id: $id})
              MATCH (o:Order {id: $orderId})
              MERGE (o)-[:HAS_PAYMENT]->(p)
            `,
            params: { id: p._id.toString(), orderId: p.orderId?.toString() },
          }
        );
      }

      // 7. Sync Channel Connections & External Mappings
      const connections = await ChannelConnection.find({ updatedAt: { $gt: lastSyncTime } });
      for (const conn of connections) {
        queries.push({
            query: `
              MERGE (n:ChannelConnection {id: $id})
              ON CREATE SET n.provider = $provider, n.status = $status, n.tenantId = $tenantId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.status = $status, n.updatedAt = $updatedAt
            `,
            params: {
              id: conn._id.toString(),
              provider: conn.provider,
              status: conn.status,
              tenantId: conn.tenantId?.toString(),
              createdAt: conn.createdAt?.toISOString(),
              updatedAt: conn.updatedAt?.toISOString(),
            },
        });
      }

      const externalOrders = await ExternalOrder.find({ updatedAt: { $gt: lastSyncTime } });
      for (const ext of externalOrders) {
        queries.push(
          {
            query: `
              MERGE (n:ExternalOrder {id: $id})
              ON CREATE SET n.externalOrderId = $externalOrderId, n.provider = $provider, n.status = $status, n.tenantId = $tenantId, n.createdAt = $createdAt, n.updatedAt = $updatedAt
              ON MATCH SET n.status = $status, n.updatedAt = $updatedAt
            `,
            params: {
              id: ext._id.toString(),
              externalOrderId: ext.externalOrderId,
              provider: ext.provider,
              status: ext.status,
              tenantId: ext.tenantId?.toString(),
              createdAt: ext.createdAt?.toISOString(),
              updatedAt: ext.updatedAt?.toISOString(),
            },
          },
          {
            query: `
              MATCH (ext:ExternalOrder {id: $id})
              MATCH (ord:Order {id: $internalOrderId})
              MERGE (ext)-[:MAPS_TO]->(ord)
            `,
            params: { id: ext._id.toString(), internalOrderId: ext.internalOrderId?.toString() },
          }
        );

        if (ext.connectionId) {
          queries.push({
            query: `
              MATCH (ext:ExternalOrder {id: $id})
              MATCH (conn:ChannelConnection {id: $channelConnectionId})
              MERGE (ext)-[:FROM_CONNECTION]->(conn)
            `,
            params: { id: ext._id.toString(), channelConnectionId: ext.connectionId.toString() },
          });
        }
      }

      // Execute in transactional chunks to optimize memory and connection limits
      if (queries.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < queries.length; i += chunkSize) {
          const chunk = queries.slice(i, i + chunkSize);
          await Neo4jService.runWriteTransaction(chunk);
          txCount += chunk.length;
        }
      }
    } catch (error: any) {
      console.error('[GraphSyncService] Sync error:', error.message);
      throw error;
    }

    return txCount;
  }
}
