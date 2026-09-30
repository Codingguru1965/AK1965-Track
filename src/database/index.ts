import { open, DB, QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './schema';

const DB_NAME = 'ak1965_track.db';

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: DB | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getDatabase(): DB {
    if (!this.db) {
      this.init();
    }
    return this.db!;
  }

  public init(): void {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      this.db = open({ name: DB_NAME });

      // Performance and integrity PRAGMAs
      this.db.executeSync('PRAGMA journal_mode = WAL;');
      this.db.executeSync('PRAGMA synchronous = NORMAL;');
      this.db.executeSync('PRAGMA foreign_keys = ON;');
      this.db.executeSync('PRAGMA busy_timeout = 5000;');

      this.runMigrations();
      this.isInitialized = true;
      console.log('[DatabaseManager] SQLite database initialized successfully');
    } catch (error) {
      console.error('[DatabaseManager] Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  private runMigrations(): void {
    if (!this.db) return;

    // Ensure migration tracker table exists
    this.db.executeSync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    // Fetch applied versions
    const result = this.db.executeSync('SELECT version FROM schema_migrations ORDER BY version ASC;');
    const appliedVersions = new Set<number>();
    if (result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        if (typeof row.version === 'number') {
          appliedVersions.add(row.version);
        }
      }
    }

    // Apply pending migrations
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[DatabaseManager] Applying migration v${migration.version}...`);
        for (const statement of migration.up) {
          this.db.executeSync(statement);
        }
        this.db.executeSync(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);',
          [migration.version, Date.now()]
        );
        console.log(`[DatabaseManager] Migration v${migration.version} applied.`);
      }
    }
  }

  public execute(query: string, params: Scalar[] = []): QueryResult {
    return this.getDatabase().executeSync(query, params);
  }

  public async executeAsync(query: string, params: Scalar[] = []): Promise<QueryResult> {
    return this.getDatabase().execute(query, params);
  }

  public executeBatch(tuples: [string, Scalar[]][]): void {
    const db = this.getDatabase();
    for (const [sql, params] of tuples) {
      db.executeSync(sql, params);
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[DatabaseManager] Database closed.');
    }
  }
}

export const getDB = (): DB => DatabaseManager.getInstance().getDatabase();
export const dbManager = DatabaseManager.getInstance();
