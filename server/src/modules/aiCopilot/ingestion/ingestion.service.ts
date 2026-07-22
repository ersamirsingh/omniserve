import CopilotSyncState from './aiCopilot-sync-state.model.js';
import { VectorSyncService } from './vector-sync.service.js';
import { GraphSyncService } from './graph-sync.service.js';

export class IngestionService {
  private static isSyncing = false;
  private static intervalId: NodeJS.Timeout | null = null;

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

      let state = await CopilotSyncState.findOne({ serviceName: 'RAG_CHATBOT_PIPELINE' });
      if (!state) {
        state = await CopilotSyncState.create({
          serviceName: 'RAG_CHATBOT_PIPELINE',
          lastSyncedAt: new Date(0),
          status: 'IDLE',
          recordsSynced: 0,
        });
      }

      const lastSyncTime = forceFullReindex ? new Date(0) : state.lastSyncedAt;

      await CopilotSyncState.updateOne(
        { serviceName: 'RAG_CHATBOT_PIPELINE' },
        { status: 'SYNCING' }
      );

      const [vectorSynced, graphSynced] = await Promise.all([
        VectorSyncService.syncAll(lastSyncTime),
        GraphSyncService.syncAll(lastSyncTime),
      ]);

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

  static stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
