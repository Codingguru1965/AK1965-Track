import { dbManager } from '../index';
import { SyncQueueRow } from '../types';

export interface SyncQueueItem {
  id: string;
  entityType: 'activity' | 'user' | 'location';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  retryCount: number;
  lastError: string | null;
  createdAt: number;
}

export class SyncQueueRepository {
  public static enqueue(item: {
    id?: string;
    entityType: 'activity' | 'user' | 'location';
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    payload: any;
  }): void {
    const query = `
      INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, payload, retry_count, last_error, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?);
    `;

    const id = item.id || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payloadStr = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload);

    dbManager.execute(query, [
      id,
      item.entityType,
      item.entityId,
      item.operation,
      payloadStr,
      Date.now(),
    ]);
  }

  public static peek(limit = 20): SyncQueueItem[] {
    const query = `
      SELECT * FROM sync_queue 
      ORDER BY created_at ASC 
      LIMIT ?;
    `;
    const result = dbManager.execute(query, [limit]);
    if (!result.rows) return [];
    return result.rows.map((row) => this.mapRowToItem(row as unknown as SyncQueueRow));
  }

  public static remove(id: string): void {
    dbManager.execute('DELETE FROM sync_queue WHERE id = ?;', [id]);
  }

  public static recordFailure(id: string, errorMessage: string): void {
    const query = `
      UPDATE sync_queue 
      SET retry_count = retry_count + 1, last_error = ? 
      WHERE id = ?;
    `;
    dbManager.execute(query, [errorMessage, id]);
  }

  public static getPendingCount(): number {
    const result = dbManager.execute('SELECT COUNT(*) AS count FROM sync_queue;', []);
    return Number(result.rows?.[0]?.count || 0);
  }

  public static clear(): void {
    dbManager.execute('DELETE FROM sync_queue;', []);
  }

  private static mapRowToItem(row: SyncQueueRow): SyncQueueItem {
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {
      parsedPayload = row.payload;
    }

    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: parsedPayload,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
    };
  }
}
