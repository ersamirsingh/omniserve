import CopilotSyncState from './aiCopilot-sync-state.model.js';
import { VectorSyncService } from './vector-sync.service.js';
import { GraphSyncService } from './graph-sync.service.js';

export class IngestionService {
  private static isSyncing = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Runs the incremental sync pipeline for both VectorDB and GraphDB.
   * Prevents concurrent sync execution using an in-memory lock flag.
   */
  static async runIncrementalSync(forceFullReindex = false): Promise<{
    success: boolean;
    vectorSynced: number;
    graphSynced: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      console.warn('[IngestionService] Sync already in progress, skipping execution.');
      return { success: false, vectorSynced: 0, graphSynced: 0, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const now = new Date();

    try {
      // Find or create sync state entry
      let state = await CopilotSyncState.findOne({ serviceName: 'RAG_CHATBOT_PIPELINE' });
      if (!state) {
        state = await CopilotSyncState.create({
          serviceName: 'RAG_CHATBOT_PIPELINE',
          lastSyncedAt: new Date(0), // Epoch (1970) to index all initial data
          status: 'IDLE',
          recordsSynced: 0,
        });
      }

      const lastSyncTime = forceFullReindex ? new Date(0) : state.lastSyncedAt;

      await CopilotSyncState.updateOne(
        { serviceName: 'RAG_CHATBOT_PIPELINE' },
        { status: 'SYNCING' }
      );

      // Execute Vector & Graph sync concurrently
      const [vectorSynced, graphSynced] = await Promise.all([
        VectorSyncService.syncAll(lastSyncTime),
        GraphSyncService.syncAll(lastSyncTime),
      ]);

      // Update sync state on success
      await CopilotSyncState.updateOne(
        { serviceName: 'RAG_CHATBOT_PIPELINE' },
        {
          lastSyncedAt: now,
          status: 'SUCCESS',
          recordsSynced: vectorSynced + graphSynced,
        }
      );


      return {
        success: true,
        vectorSynced,
        graphSynced,
      };
    } catch (error: any) {
      console.error('[IngestionService] Ingestion pipeline failed:', error);
      await CopilotSyncState.updateOne(
        { serviceName: 'RAG_CHATBOT_PIPELINE' },
        { status: 'FAILED' }
      );
      return {
        success: false,
        vectorSynced: 0,
        graphSynced: 0,
        error: error.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Starts a scheduled background interval to index deltas.
   * @param {number} [intervalMs=300000] - Interval time (default 5 minutes)
   */
  static startScheduler(intervalMs = 300000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.runIncrementalSync();
      } catch (err) {
        console.error('[IngestionService] Scheduled sync failed:', err);
      }
    }, intervalMs);
  }

  /**
   * Stops the scheduled background sync task.
   */
  static stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
