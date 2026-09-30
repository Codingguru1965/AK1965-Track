import { ActivityType, ActivityStatus, SyncStatus } from '../types';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  age: number;
  weight: number;
  sync_status: SyncStatus;
  created_at: number;
  updated_at: number;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  start_time: number;
  end_time: number | null;
  duration: number; // seconds
  distance: number; // meters
  avg_speed: number; // km/h
  avg_pace: number; // sec/km
  calories: number; // kcal
  steps: number;
  status: ActivityStatus;
  sync_status: SyncStatus;
  created_at: number;
  updated_at: number;
}

export interface LocationRow {
  id: string;
  activity_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
  sequence_number: number;
}

export interface SyncQueueRow {
  id: string;
  entity_type: 'activity' | 'user' | 'location';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: string; // JSON string
  retry_count: number;
  last_error: string | null;
  created_at: number;
}
