import { ActivityLocation, ActivityType } from '../../types';

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

export interface RawLocationData {
  activityId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  accuracy?: number;
  bearing?: number;
  timestamp: number;
}

export class LocationFilter {
  /**
   * Haversine formula to compute geodesic distance between two GPS coordinates in meters
   */
  public static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (angle: number) => (angle * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  /**
   * Validates whether a raw GPS point should be accepted or discarded due to noise/drift
   */
  public static isValidPoint(
    newPoint: RawLocationData,
    lastPoint: ActivityLocation | null,
    activityType: ActivityType
  ): { valid: boolean; distance: number; reason?: string } {
    // 1. Accuracy Filter: discard points with accuracy > 25 meters
    const accuracy = newPoint.accuracy ?? 0;
    if (accuracy > 25.0) {
      return { valid: false, distance: 0, reason: `Low accuracy (${accuracy.toFixed(1)}m > 25m)` };
    }

    // First accepted point is always valid with 0 distance
    if (!lastPoint) {
      return { valid: true, distance: 0 };
    }

    // 2. Geodesic distance calculation
    const distance = this.calculateDistance(
      lastPoint.latitude,
      lastPoint.longitude,
      newPoint.latitude,
      newPoint.longitude
    );

    // 3. Stationary Jitter Filter: ignore tiny jitter movements (< 2.5 meters)
    if (distance < 2.5) {
      return { valid: false, distance: 0, reason: `Stationary jitter (${distance.toFixed(1)}m < 2.5m)` };
    }

    // 4. Elapsed time & Speed jump filter
    const timeDeltaSeconds = Math.max((newPoint.timestamp - lastPoint.timestamp) / 1000, 0.5);
    const calculatedSpeedMps = distance / timeDeltaSeconds;

    const maxSpeedLimits: Record<ActivityType, number> = {
      walking: 5.5,   // ~19.8 km/h
      running: 14.0,  // ~50.4 km/h (Usain Bolt top is ~12.4 m/s)
      cycling: 25.0,  // ~90.0 km/h (pro downhill max)
    };

    const limit = maxSpeedLimits[activityType] || 14.0;
    if (calculatedSpeedMps > limit) {
      return {
        valid: false,
        distance: 0,
        reason: `Impossible speed jump (${(calculatedSpeedMps * 3.6).toFixed(1)} km/h > ${(limit * 3.6).toFixed(1)} km/h)`,
      };
    }

    return { valid: true, distance };
  }

  /**
   * Calculates pace in seconds per kilometer
   */
  public static calculatePace(durationSeconds: number, distanceMeters: number): number {
    if (distanceMeters <= 50 || durationSeconds <= 0) return 0;
    const distanceKm = distanceMeters / 1000;
    return Math.round(durationSeconds / distanceKm);
  }

  /**
   * Formats pace seconds into readable string (e.g., 5'42" /km)
   */
  public static formatPace(paceSeconds: number): string {
    if (paceSeconds <= 0 || !isFinite(paceSeconds) || paceSeconds > 3600) {
      return "--'--\" /km";
    }
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}" /km`;
  }

  /**
   * Calculates speed in km/h
   */
  public static calculateSpeed(durationSeconds: number, distanceMeters: number): number {
    if (durationSeconds <= 0 || distanceMeters <= 0) return 0;
    const hours = durationSeconds / 3600;
    const km = distanceMeters / 1000;
    return parseFloat((km / hours).toFixed(2));
  }
}
