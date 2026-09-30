import { dbManager } from '../index';
import { UserProfile } from '../../types';
import { UserRow } from '../types';

export class UserRepository {
  public static upsert(user: UserProfile): void {
    const query = `
      INSERT INTO users (id, username, email, age, weight, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        email = excluded.email,
        age = excluded.age,
        weight = excluded.weight,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at;
    `;
    const now = Date.now();
    dbManager.execute(query, [
      user.id,
      user.username,
      user.email,
      user.age,
      user.weight,
      user.syncStatus || 'synced',
      user.createdAt ? new Date(user.createdAt).getTime() : now,
      now,
    ]);
  }

  public static getById(id: string): UserProfile | null {
    const query = 'SELECT * FROM users WHERE id = ? LIMIT 1;';
    const result = dbManager.execute(query, [id]);
    if (result.rows && result.rows.length > 0) {
      return this.mapRowToUserProfile(result.rows[0] as unknown as UserRow);
    }
    return null;
  }

  public static getByEmail(email: string): UserProfile | null {
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;';
    const result = dbManager.execute(query, [email]);
    if (result.rows && result.rows.length > 0) {
      return this.mapRowToUserProfile(result.rows[0] as unknown as UserRow);
    }
    return null;
  }

  public static updateWeight(id: string, weight: number): void {
    const query = 'UPDATE users SET weight = ?, updated_at = ? WHERE id = ?;';
    dbManager.execute(query, [weight, Date.now(), id]);
  }

  private static mapRowToUserProfile(row: UserRow): UserProfile {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      age: row.age,
      weight: row.weight,
      syncStatus: row.sync_status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
