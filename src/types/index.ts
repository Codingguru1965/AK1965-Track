export type ActivityType = 'running' | 'walking' | 'cycling';

export type ActivityStatus = 'active' | 'paused' | 'completed' | 'discarded';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type GPSStatus = 'searching' | 'active' | 'weak' | 'unavailable';

export type NetworkStatus = 'online' | 'offline' | 'syncing' | 'sync_error';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  age: number;
  weight: number; // in kg
  isOffline?: boolean;
  syncStatus?: SyncStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLocation {
  id?: string;
  activityId: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null; // in m/s
  accuracy?: number | null; // in meters
  timestamp: number; // epoch ms
  sequence: number;
}

export interface Activity {
  id: string; // client-generated UUID
  userId: string;
  activityType: ActivityType;
  startTime: number;
  endTime?: number | null;
  duration: number; // active duration in seconds (excludes paused time)
  distance: number; // distance in meters
  averageSpeed: number; // in km/h
  averagePace: number; // in seconds/km
  calories: number; // estimated kcal
  steps?: number; // hardware step count
  status: ActivityStatus;
  syncStatus: SyncStatus;
  createdAt: number;
  updatedAt: number;
  locations?: ActivityLocation[];
}

export interface ActivitySummaryStats {
  todayDistance: number;
  thisWeekDistance: number;
  thisWeekActivitiesCount: number;
  totalDistance: number;
  totalActivitiesCount: number;
  totalDurationSeconds: number;
}

export interface PersonalRecords {
  longestDistance: { distance: number; type: ActivityType; date: number } | null;
  fastestPaceRunning: { pace: number; distance: number; date: number } | null;
  fastestPaceWalking: { pace: number; distance: number; date: number } | null;
  highestSpeedCycling: { speed: number; distance: number; date: number } | null;
}
