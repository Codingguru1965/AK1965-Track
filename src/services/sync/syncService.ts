import { apiClient } from '../api/apiClient';
import { networkMonitor } from '../network/networkMonitor';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { LocationRepository } from '../../database/repositories/LocationRepository';
import { SyncQueueRepository } from '../../database/repositories/SyncQueueRepository';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

type SyncListener = (syncing: boolean, lastResult?: SyncResult) => void;

class SyncService {
  private static instance: SyncService;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private autoSyncRegistered: boolean = false;

  private constructor() {
    this.initAutoSync();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.isSyncing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(syncing: boolean, result?: SyncResult): void {
    this.isSyncing = syncing;
    this.listeners.forEach((listener) => {
      try {
        listener(syncing, result);
      } catch (e) {
        console.error('[SyncService] Listener error:', e);
      }
    });
  }

  private initAutoSync(): void {
    if (this.autoSyncRegistered) return;
    this.autoSyncRegistered = true;

    // Trigger sync when network connection becomes available
    networkMonitor.subscribe((isConnected) => {
      if (isConnected) {
        console.log('[SyncService] Network connected, triggering auto-sync...');
        this.triggerSync();
      }
    });
  }

  public async triggerSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping.');
      return { success: false, syncedCount: 0, error: 'Sync in progress' };
    }

    if (!networkMonitor.isConnected) {
      console.log('[SyncService] Device is offline, sync deferred.');
      return { success: false, syncedCount: 0, error: 'Device is offline' };
    }

    this.notify(true);

    try {
      // 1. Gather all activities pending sync
      const pendingActivities = ActivityRepository.getPendingSync();
      const queuePending = SyncQueueRepository.peek(30);

      if (pendingActivities.length === 0 && queuePending.length === 0) {
        console.log('[SyncService] No pending items to sync.');
        const result: SyncResult = { success: true, syncedCount: 0 };
        this.notify(false, result);
        return result;
      }

      console.log(`[SyncService] Found ${pendingActivities.length} pending activities to sync.`);

      // 2. Prepare payload
      const formattedActivities = pendingActivities.map((act) => ({
        clientActivityId: act.id,
        activityType: act.activityType,
        startTime: new Date(act.startTime).toISOString(),
        endTime: act.endTime ? new Date(act.endTime).toISOString() : new Date().toISOString(),
        duration: act.duration,
        distance: act.distance,
        avgSpeed: act.averageSpeed,
        avgPace: act.averagePace,
        calories: act.calories,
        steps: act.steps || 0,
        status: act.status,
      }));

      // Gather GPS breadcrumb locations for each pending activity
      const allLocations: any[] = [];
      for (const act of pendingActivities) {
        const locations = LocationRepository.getByActivityId(act.id);
        for (const loc of locations) {
          allLocations.push({
            activityId: act.id,
            sequenceNumber: loc.sequence,
            latitude: loc.latitude,
            longitude: loc.longitude,
            altitude: loc.altitude || 0,
            speed: loc.speed || 0,
            accuracy: loc.accuracy || 0,
            timestamp: new Date(loc.timestamp).toISOString(),
          });
        }
      }

      // 3. Post to backend idempotent sync endpoint
      const response = await apiClient.post('/activities/sync', {
        activities: formattedActivities,
        locations: allLocations,
      });

      if (response.data?.success) {
        const syncedIds: string[] = response.data.syncedActivityIds || [];
        console.log(`[SyncService] Successfully synced ${syncedIds.length} activities with cloud.`);

        // 4. Mark local SQLite activities as 'synced'
        for (const id of syncedIds) {
          ActivityRepository.updateSyncStatus(id, 'synced');
        }

        // 5. Clean up matching sync queue items
        for (const qItem of queuePending) {
          if (syncedIds.includes(qItem.entityId)) {
            SyncQueueRepository.remove(qItem.id);
          }
        }

        const result: SyncResult = {
          success: true,
          syncedCount: syncedIds.length,
        };
        this.notify(false, result);
        return result;
      } else {
        throw new Error(response.data?.message || 'Sync failed on server');
      }
    } catch (error: any) {
      console.error('[SyncService] Sync failed:', error.message);

      // Record failure for pending queue items
      const queuePending = SyncQueueRepository.peek(10);
      for (const item of queuePending) {
        SyncQueueRepository.recordFailure(item.id, error.message);
      }

      const result: SyncResult = {
        success: false,
        syncedCount: 0,
        error: error.message,
      };
      this.notify(false, result);
      return result;
    }
  }

  public getPendingCount(): number {
    return ActivityRepository.getPendingSync().length + SyncQueueRepository.getPendingCount();
  }
}

export const syncService = SyncService.getInstance();
