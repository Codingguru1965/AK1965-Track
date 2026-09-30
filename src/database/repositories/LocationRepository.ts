import { dbManager } from '../index';
import { ActivityLocation } from '../../types';
import { LocationRow } from '../types';

export class LocationRepository {
  public static insert(location: ActivityLocation, userId: string): void {
    const query = `
      INSERT INTO activity_locations (
        id, activity_id, user_id, latitude, longitude, altitude,
        speed, accuracy, timestamp, sequence_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    dbManager.execute(query, [
      location.id || `${location.activityId}_${location.sequence}`,
      location.activityId,
      userId,
      location.latitude,
      location.longitude,
      location.altitude ?? null,
      location.speed ?? null,
      location.accuracy ?? null,
      location.timestamp,
      location.sequence,
    ]);
  }

  public static insertBatch(locations: ActivityLocation[], userId: string): void {
    if (!locations || locations.length === 0) return;

    const query = `
      INSERT INTO activity_locations (
        id, activity_id, user_id, latitude, longitude, altitude,
        speed, accuracy, timestamp, sequence_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const tuples: [string, any[]][] = locations.map((loc) => [
      query,
      [
        loc.id || `${loc.activityId}_${loc.sequence}`,
        loc.activityId,
        userId,
        loc.latitude,
        loc.longitude,
        loc.altitude ?? null,
        loc.speed ?? null,
        loc.accuracy ?? null,
        loc.timestamp,
        loc.sequence,
      ],
    ]);

    dbManager.executeBatch(tuples);
  }

  public static getByActivityId(activityId: string): ActivityLocation[] {
    const query = `
      SELECT * FROM activity_locations 
      WHERE activity_id = ? 
      ORDER BY sequence_number ASC;
    `;
    const result = dbManager.execute(query, [activityId]);
    if (!result.rows) return [];
    return result.rows.map((row) => this.mapRowToLocation(row as unknown as LocationRow));
  }

  public static deleteByActivityId(activityId: string): void {
    dbManager.execute('DELETE FROM activity_locations WHERE activity_id = ?;', [activityId]);
  }

  private static mapRowToLocation(row: LocationRow): ActivityLocation {
    return {
      id: row.id,
      activityId: row.activity_id,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      speed: row.speed,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      sequence: row.sequence_number,
    };
  }
}
