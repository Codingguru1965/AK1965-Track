export interface Migration {
  version: number;
  up: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      // Users table for local offline profile caching
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER NOT NULL DEFAULT 25,
        weight REAL NOT NULL DEFAULT 70.0,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      // Activities table for local offline tracking
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER NOT NULL DEFAULT 0,
        distance REAL NOT NULL DEFAULT 0.0,
        avg_speed REAL NOT NULL DEFAULT 0.0,
        avg_pace REAL NOT NULL DEFAULT 0.0,
        calories REAL NOT NULL DEFAULT 0.0,
        steps INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      // Activity locations for full GPS coordinate trail
      `CREATE TABLE IF NOT EXISTS activity_locations (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        speed REAL,
        accuracy REAL,
        timestamp INTEGER NOT NULL,
        sequence_number INTEGER NOT NULL,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      );`,

      // Index for fast coordinate trajectory queries
      `CREATE INDEX IF NOT EXISTS idx_activity_locations_seq 
       ON activity_locations(activity_id, sequence_number ASC);`,

      // Sync queue for offline-first mutation log
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL
      );`,

      // Index for FIFO queue processing
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_created 
       ON sync_queue(created_at ASC);`,

      // Metadata table to track current schema version
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );`
    ],
  },
];
