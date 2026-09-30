import { dbManager } from '../index';
import { Activity, ActivityStatus, SyncStatus, ActivitySummaryStats, PersonalRecords } from '../../types';
import { ActivityRow } from '../types';

export class ActivityRepository {
  public static create(activity: Activity): void {
    const query = `
      INSERT INTO activities (
        id, user_id, activity_type, start_time, end_time, duration,
        distance, avg_speed, avg_pace, calories, steps, status,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    dbManager.execute(query, [
      activity.id,
      activity.userId,
      activity.activityType,
      activity.startTime,
      activity.endTime ?? null,
      activity.duration,
      activity.distance,
      activity.averageSpeed,
      activity.averagePace,
      activity.calories,
      activity.steps ?? 0,
      activity.status,
      activity.syncStatus,
      activity.createdAt,
      activity.updatedAt,
    ]);
  }

  public static updateMetrics(
    id: string,
    updates: {
      duration: number;
      distance: number;
      avgSpeed: number;
      avgPace: number;
      calories: number;
      steps?: number;
    }
  ): void {
    const query = `
      UPDATE activities SET
        duration = ?,
        distance = ?,
        avg_speed = ?,
        avg_pace = ?,
        calories = ?,
        steps = COALESCE(?, steps),
        updated_at = ?
      WHERE id = ?;
    `;

    dbManager.execute(query, [
      updates.duration,
      updates.distance,
      updates.avgSpeed,
      updates.avgPace,
      updates.calories,
      updates.steps ?? null,
      Date.now(),
      id,
    ]);
  }

  public static updateStatus(id: string, status: ActivityStatus): void {
    const query = 'UPDATE activities SET status = ?, updated_at = ? WHERE id = ?;';
    dbManager.execute(query, [status, Date.now(), id]);
  }

  public static finish(
    id: string,
    endTime: number,
    duration: number,
    distance: number,
    avgSpeed: number,
    avgPace: number,
    calories: number,
    steps?: number
  ): void {
    const query = `
      UPDATE activities SET
        status = 'completed',
        end_time = ?,
        duration = ?,
        distance = ?,
        avg_speed = ?,
        avg_pace = ?,
        calories = ?,
        steps = COALESCE(?, steps),
        updated_at = ?
      WHERE id = ?;
    `;

    dbManager.execute(query, [
      endTime,
      duration,
      distance,
      avgSpeed,
      avgPace,
      calories,
      steps ?? null,
      Date.now(),
      id,
    ]);
  }

  public static updateSyncStatus(id: string, syncStatus: SyncStatus): void {
    const query = 'UPDATE activities SET sync_status = ?, updated_at = ? WHERE id = ?;';
    dbManager.execute(query, [syncStatus, Date.now(), id]);
  }

  public static getById(id: string): Activity | null {
    const query = 'SELECT * FROM activities WHERE id = ? LIMIT 1;';
    const result = dbManager.execute(query, [id]);
    if (result.rows && result.rows.length > 0) {
      return this.mapRowToActivity(result.rows[0] as unknown as ActivityRow);
    }
    return null;
  }

  public static getByUserId(userId: string, limit = 50, offset = 0): Activity[] {
    const query = `
      SELECT * FROM activities 
      WHERE user_id = ? AND status != 'discarded'
      ORDER BY start_time DESC 
      LIMIT ? OFFSET ?;
    `;
    const result = dbManager.execute(query, [userId, limit, offset]);
    if (!result.rows) return [];
    return result.rows.map((row) => this.mapRowToActivity(row as unknown as ActivityRow));
  }

  public static getPendingSync(): Activity[] {
    const query = `
      SELECT * FROM activities 
      WHERE sync_status IN ('pending', 'failed') AND status = 'completed'
      ORDER BY created_at ASC;
    `;
    const result = dbManager.execute(query, []);
    if (!result.rows) return [];
    return result.rows.map((row) => this.mapRowToActivity(row as unknown as ActivityRow));
  }

  public static delete(id: string): void {
    dbManager.execute('DELETE FROM activities WHERE id = ?;', [id]);
  }

  public static getStats(userId: string): ActivitySummaryStats {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Start of current week (Monday)
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();

    // Today distance
    const todayRes = dbManager.execute(
      `SELECT COALESCE(SUM(distance), 0) AS distance 
       FROM activities 
       WHERE user_id = ? AND status = 'completed' AND start_time >= ?;`,
      [userId, startOfToday]
    );
    const todayDistance = Number(todayRes.rows?.[0]?.distance || 0);

    // Week distance and count
    const weekRes = dbManager.execute(
      `SELECT COALESCE(SUM(distance), 0) AS distance, COUNT(*) AS count 
       FROM activities 
       WHERE user_id = ? AND status = 'completed' AND start_time >= ?;`,
      [userId, startOfWeek]
    );
    const thisWeekDistance = Number(weekRes.rows?.[0]?.distance || 0);
    const thisWeekActivitiesCount = Number(weekRes.rows?.[0]?.count || 0);

    // Total stats
    const totalRes = dbManager.execute(
      `SELECT COALESCE(SUM(distance), 0) AS distance, 
              COUNT(*) AS count, 
              COALESCE(SUM(duration), 0) AS duration 
       FROM activities 
       WHERE user_id = ? AND status = 'completed';`,
      [userId]
    );
    const totalDistance = Number(totalRes.rows?.[0]?.distance || 0);
    const totalActivitiesCount = Number(totalRes.rows?.[0]?.count || 0);
    const totalDurationSeconds = Number(totalRes.rows?.[0]?.duration || 0);

    return {
      todayDistance,
      thisWeekDistance,
      thisWeekActivitiesCount,
      totalDistance,
      totalActivitiesCount,
      totalDurationSeconds,
    };
  }

  public static getPersonalRecords(userId: string): PersonalRecords {
    // Longest distance across all activities
    const longestRes = dbManager.execute(
      `SELECT distance, activity_type, start_time 
       FROM activities 
       WHERE user_id = ? AND status = 'completed' AND distance > 0
       ORDER BY distance DESC LIMIT 1;`,
      [userId]
    );
    const longest = longestRes.rows?.[0];

    // Fastest running pace (lowest averagePace with distance >= 1000m)
    const runRes = dbManager.execute(
      `SELECT avg_pace, distance, start_time 
       FROM activities 
       WHERE user_id = ? AND activity_type = 'running' AND status = 'completed' AND distance >= 1000 AND avg_pace > 0
       ORDER BY avg_pace ASC LIMIT 1;`,
      [userId]
    );
    const fastestRun = runRes.rows?.[0];

    // Fastest walking pace (lowest averagePace with distance >= 500m)
    const walkRes = dbManager.execute(
      `SELECT avg_pace, distance, start_time 
       FROM activities 
       WHERE user_id = ? AND activity_type = 'walking' AND status = 'completed' AND distance >= 500 AND avg_pace > 0
       ORDER BY avg_pace ASC LIMIT 1;`,
      [userId]
    );
    const fastestWalk = walkRes.rows?.[0];

    // Highest cycling speed (highest avg_speed with distance >= 1000m)
    const cycleRes = dbManager.execute(
      `SELECT avg_speed, distance, start_time 
       FROM activities 
       WHERE user_id = ? AND activity_type = 'cycling' AND status = 'completed' AND distance >= 1000 AND avg_speed > 0
       ORDER BY avg_speed DESC LIMIT 1;`,
      [userId]
    );
    const fastestCycle = cycleRes.rows?.[0];

    return {
      longestDistance: longest
        ? {
            distance: Number(longest.distance),
            type: longest.activity_type as any,
            date: Number(longest.start_time),
          }
        : null,
      fastestPaceRunning: fastestRun
        ? {
            pace: Number(fastestRun.avg_pace),
            distance: Number(fastestRun.distance),
            date: Number(fastestRun.start_time),
          }
        : null,
      fastestPaceWalking: fastestWalk
        ? {
            pace: Number(fastestWalk.avg_pace),
            distance: Number(fastestWalk.distance),
            date: Number(fastestWalk.start_time),
          }
        : null,
      highestSpeedCycling: fastestCycle
        ? {
            speed: Number(fastestCycle.avg_speed),
            distance: Number(fastestCycle.distance),
            date: Number(fastestCycle.start_time),
          }
        : null,
    };
  }

  private static mapRowToActivity(row: ActivityRow): Activity {
    return {
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      distance: row.distance,
      averageSpeed: row.avg_speed,
      averagePace: row.avg_pace,
      calories: row.calories,
      steps: row.steps,
      status: row.status,
      syncStatus: row.sync_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
