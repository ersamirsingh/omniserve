import { QdrantClient } from '@qdrant/js-client-rest';
import { COPILOT_CONFIG } from '../config/aiCopilot-env.config.js';

export interface IQdrantPayload {
  tenantId?: string;
  outletId?: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
  [key: string]: any;
}

export interface IQdrantPoint {
  id: string | number;
  vector: number[];
  payload: IQdrantPayload;
}

let clientInstance: any = null;

export class QdrantService {
  /**
   * Returns the Qdrant client instance, initializing it if necessary.
   * Falls back to a mock client if QDRANT_URL is not set or connection fails.
   */
  static getClient(): any {
    if (clientInstance) return clientInstance;

    const url = COPILOT_CONFIG.qdrant.url;
    const apiKey = COPILOT_CONFIG.qdrant.apiKey;

    if (!url) {
      console.warn('[QdrantService] QDRANT_URL is missing. Operating in MOCK mode.');
      clientInstance = this.createMockClient();
      return clientInstance;
    }

    try {
      clientInstance = new QdrantClient({ url, apiKey });
    } catch (error: any) {
      console.error('[QdrantService] Failed to initialize client, falling back to MOCK:', error.message);
      clientInstance = this.createMockClient();
    }

    return clientInstance;
  }

  /**
   * Creates a mock client for environment flexibility when Qdrant is not active.
   */
  private static createMockClient(): any {
    const mockStore = new Map<string, IQdrantPoint[]>();
    return {
      isMock: true,
      getCollections: async () => ({ collections: [] }),
      createCollection: async () => true,
      upsert: async (collectionName: string, { points }: { points: IQdrantPoint[] }) => {
        if (!mockStore.has(collectionName)) mockStore.set(collectionName, []);
        const list = mockStore.get(collectionName)!;
        for (const pt of points) {
          const idx = list.findIndex(p => p.id === pt.id);
          if (idx !== -1) list[idx] = pt;
          else list.push(pt);
        }
        return { status: 'acknowledged' };
      },
      search: async (collectionName: string, { vector, filter, limit = 5 }: any) => {
        const list = mockStore.get(collectionName) || [];
        return list
          .filter(pt => {
            if (!filter || !filter.must) return true;
            return filter.must.every((cond: any) => {
              if (cond.key && cond.match?.value !== undefined) {
                return pt.payload?.[cond.key] === cond.match.value;
              }
              return true;
            });
          })
          .slice(0, limit)
          .map(pt => ({
            id: pt.id,
            score: 0.95,
            payload: pt.payload,
          }));
      },
    };
  }

  /**
   * Ensures that the RAG vector collection exists with the correct vector size.
   */
  static async ensureCollection(): Promise<void> {
    const client = this.getClient();
    const collectionName = COPILOT_CONFIG.qdrant.collectionName;

    if (client.isMock) return;

    try {
      const response = await client.getCollections();
      const exists = response.collections.some((c: any) => c.name === collectionName);

      if (!exists) {
        await client.createCollection(collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });
      }
    } catch (error: any) {
      console.error('[QdrantService] Error ensuring collection exists:', error.message);
    }
  }

  /**
   * Syncs a batch of documents into the vector database.
   */
  static async upsertDocuments(points: IQdrantPoint[]): Promise<void> {
    const client = this.getClient();
    const collectionName = COPILOT_CONFIG.qdrant.collectionName;

    if (!points || points.length === 0) return;

    try {
      await client.upsert(collectionName, { points });
    } catch (error: any) {
      console.error(`[QdrantService] Error upserting points:`, error.message);
      throw error;
    }
  }

  /**
   * Performs a vector similarity search with security scoping.
   */
  static async searchVectors(
    vector: number[],
    scopeFilter: { tenantId?: string; outletId?: string },
    entityType: string | null = null,
    limit: number = 5
  ): Promise<Array<{ id: string | number; score: number; payload: IQdrantPayload }>> {
    const client = this.getClient();
    const collectionName = COPILOT_CONFIG.qdrant.collectionName;

    const mustFilters: any[] = [];

    // ENFORCE SECURITY SCOPE IN QUERY LAYER
    if (scopeFilter.tenantId) {
      mustFilters.push({
        key: 'tenantId',
        match: { value: scopeFilter.tenantId.toString() },
      });
    }

    if (scopeFilter.outletId) {
      mustFilters.push({
        key: 'outletId',
        match: { value: scopeFilter.outletId.toString() },
      });
    }

    if (entityType) {
      mustFilters.push({
        key: 'entityType',
        match: { value: entityType },
      });
    }

    const searchParams: any = {
      vector,
      limit,
    };

    if (mustFilters.length > 0) {
      searchParams.filter = {
        must: mustFilters,
      };
    }

    try {
      const results = await client.search(collectionName, searchParams);
      return results.map((r: any) => ({
        id: r.id,
        score: r.score,
        payload: r.payload || {},
      }));
    } catch (error: any) {
      console.error('[QdrantService] Search error:', error.message);
      return [];
    }
  }
}
