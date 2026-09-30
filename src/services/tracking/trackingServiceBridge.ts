import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { Activity, ActivityLocation, ActivityStatus, ActivityType, GPSStatus } from '../../types';
import { LocationFilter, RawLocationData } from './locationFilter';
import { CalorieCalculator } from './calorieCalculator';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { LocationRepository } from '../../database/repositories/LocationRepository';
import { SyncQueueRepository } from '../../database/repositories/SyncQueueRepository';

const { TrackingModule } = NativeModules;
const trackingEmitter = TrackingModule ? new NativeEventEmitter(TrackingModule) : null;

export interface LiveTrackingState {
  activityId: string;
  activityType: ActivityType;
  status: ActivityStatus;
  duration: number; // in seconds
  distance: number; // in meters
  averagePace: number; // in sec/km
  averageSpeed: number; // in km/h
  calories: number; // in kcal
  steps: number;
  gpsStatus: GPSStatus;
  currentAccuracy: number;
  lastLocation: ActivityLocation | null;
}

type StateListener = (state: LiveTrackingState) => void;

class TrackingServiceBridge {
  private static instance: TrackingServiceBridge;

  private state: LiveTrackingState = {
    activityId: '',
    activityType: 'running',
    status: 'discarded',
    duration: 0,
    distance: 0,
    averagePace: 0,
    averageSpeed: 0,
    calories: 0,
    steps: 0,
    gpsStatus: 'unavailable',
    currentAccuracy: 0,
    lastLocation: null,
  };

  private userId: string = '';
  private userWeight: number = 70.0;
  private sequenceCounter: number = 0;
  private locationBuffer: ActivityLocation[] = [];
  private timerInterval: any = null;
  private listeners: Set<StateListener> = new Set();
  private eventSubscriptions: any[] = [];

  private constructor() {}

  public static getInstance(): TrackingServiceBridge {
    if (!TrackingServiceBridge.instance) {
      TrackingServiceBridge.instance = new TrackingServiceBridge();
    }
    return TrackingServiceBridge.instance;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const copy = { ...this.state };
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  public async startTracking(
    activityId: string,
    userId: string,
    activityType: ActivityType,
    userWeight: number
  ): Promise<void> {
    this.userId = userId;
    this.userWeight = userWeight || 70.0;
    this.sequenceCounter = 0;
    this.locationBuffer = [];

    this.state = {
      activityId,
      activityType,
      status: 'active',
      duration: 0,
      distance: 0,
      averagePace: 0,
      averageSpeed: 0,
      calories: 0,
      steps: 0,
      gpsStatus: 'searching',
      currentAccuracy: 0,
      lastLocation: null,
    };

    // Create activity entry in SQLite
    const initialActivity: Activity = {
      id: activityId,
      userId,
      activityType,
      startTime: Date.now(),
      duration: 0,
      distance: 0,
      averageSpeed: 0,
      averagePace: 0,
      calories: 0,
      steps: 0,
      status: 'active',
      syncStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ActivityRepository.create(initialActivity);

    // Setup native listeners
    this.setupNativeListeners();

    // Start native foreground service
    if (TrackingModule) {
      await TrackingModule.startTracking(activityId, activityType);
    }

    // Start 1-second active timer
    this.startTimer();
    this.notifyListeners();
  }

  private setupNativeListeners(): void {
    this.cleanupNativeListeners();

    if (!trackingEmitter) return;

    const locSub = trackingEmitter.addListener('onLocationReceived', (data: any) => {
      this.handleIncomingLocation(data as RawLocationData);
    });

    const stepSub = trackingEmitter.addListener('onStepCountReceived', (data: any) => {
      if (this.state.status === 'active') {
        this.state.steps = data?.steps ?? 0;
        this.notifyListeners();
      }
    });

    const pauseSub = trackingEmitter.addListener('onTrackingPaused', () => {
      this.pauseTracking();
    });

    const resumeSub = trackingEmitter.addListener('onTrackingResumed', () => {
      this.resumeTracking();
    });

    const stopSub = trackingEmitter.addListener('onTrackingStopped', () => {
      this.stopTracking();
    });

    this.eventSubscriptions.push(locSub, stepSub, pauseSub, resumeSub, stopSub);
  }

  private cleanupNativeListeners(): void {
    for (const sub of this.eventSubscriptions) {
      sub?.remove?.();
    }
    this.eventSubscriptions = [];
  }

  private handleIncomingLocation(data: RawLocationData): void {
    if (this.state.status !== 'active') return;

    const accuracy = data.accuracy ?? 999;
    this.state.currentAccuracy = accuracy;

    // Determine GPS strength indicator
    if (accuracy <= 10) {
      this.state.gpsStatus = 'active'; // Strong GPS
    } else if (accuracy <= 25) {
      this.state.gpsStatus = 'weak';   // Moderate/Weak GPS
    } else {
      this.state.gpsStatus = 'searching';
    }

    // Pass through noise and jitter filters
    const filterResult = LocationFilter.isValidPoint(
      data,
      this.state.lastLocation,
      this.state.activityType
    );

    console.log('[TrackingBridge] Location fix:', JSON.stringify(data), 'filter:', JSON.stringify(filterResult));

    if (!filterResult.valid) {
      this.notifyListeners();
      return;
    }

    // Create sequenced breadcrumb
    const locationPoint: ActivityLocation = {
      id: `${this.state.activityId}_${this.sequenceCounter}`,
      activityId: this.state.activityId,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      speed: data.speed,
      accuracy: data.accuracy,
      timestamp: data.timestamp || Date.now(),
      sequence: this.sequenceCounter++,
    };

    // Update state metrics
    this.state.distance += filterResult.distance;
    this.state.lastLocation = locationPoint;
    this.state.averagePace = LocationFilter.calculatePace(this.state.duration, this.state.distance);
    this.state.averageSpeed = LocationFilter.calculateSpeed(this.state.duration, this.state.distance);
    this.state.calories = CalorieCalculator.calculate(
      this.state.activityType,
      this.userWeight,
      this.state.duration
    );

    // Buffer point for batch SQLite write
    this.locationBuffer.push(locationPoint);
    if (this.locationBuffer.length >= 5) {
      this.flushLocationBuffer();
    }

    // Update SQLite activity metrics
    ActivityRepository.updateMetrics(this.state.activityId, {
      duration: this.state.duration,
      distance: this.state.distance,
      avgSpeed: this.state.averageSpeed,
      avgPace: this.state.averagePace,
      calories: this.state.calories,
      steps: this.state.steps,
    });

    this.notifyListeners();
  }

  private flushLocationBuffer(): void {
    if (this.locationBuffer.length === 0) return;
    const batch = [...this.locationBuffer];
    this.locationBuffer = [];
    LocationRepository.insertBatch(batch, this.userId);
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.state.status === 'active') {
        this.state.duration += 1;

        // Recalculate metrics based on updated duration
        this.state.averagePace = LocationFilter.calculatePace(this.state.duration, this.state.distance);
        this.state.averageSpeed = LocationFilter.calculateSpeed(this.state.duration, this.state.distance);
        this.state.calories = CalorieCalculator.calculate(
          this.state.activityType,
          this.userWeight,
          this.state.duration
        );

        // Update Android notification every 2 seconds
        if (this.state.duration % 2 === 0 && TrackingModule) {
          const distStr = `${(this.state.distance / 1000).toFixed(2)} km`;
          const mins = Math.floor(this.state.duration / 60);
          const secs = this.state.duration % 60;
          const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          const paceStr = LocationFilter.formatPace(this.state.averagePace);
          TrackingModule.updateNotification(distStr, durStr, paceStr);
        }

        this.notifyListeners();
      }
    }, 1000);
  }

  public async pauseTracking(): Promise<void> {
    if (this.state.status !== 'active') return;
    this.state.status = 'paused';
    if (TrackingModule) {
      await TrackingModule.pauseTracking();
    }
    ActivityRepository.updateStatus(this.state.activityId, 'paused');
    this.notifyListeners();
  }

  public async resumeTracking(): Promise<void> {
    if (this.state.status !== 'paused') return;
    this.state.status = 'active';
    if (TrackingModule) {
      await TrackingModule.resumeTracking();
    }
    ActivityRepository.updateStatus(this.state.activityId, 'active');
    this.notifyListeners();
  }

  public async stopTracking(): Promise<Activity | null> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (TrackingModule) {
      await TrackingModule.stopTracking();
    }

    // Flush remaining breadcrumb locations
    this.flushLocationBuffer();

    const endTime = Date.now();
    const finalActivityId = this.state.activityId;

    // Complete activity in SQLite
    ActivityRepository.finish(
      finalActivityId,
      endTime,
      this.state.duration,
      this.state.distance,
      this.state.averageSpeed,
      this.state.averagePace,
      this.state.calories,
      this.state.steps
    );

    const completed = ActivityRepository.getById(finalActivityId);

    if (completed) {
      // Enqueue sync operation for background cloud sync
      SyncQueueRepository.enqueue({
        entityType: 'activity',
        entityId: finalActivityId,
        operation: 'create',
        payload: completed,
      });
    }

    this.state.status = 'completed';
    this.cleanupNativeListeners();
    this.notifyListeners();

    return completed;
  }

  public getState(): LiveTrackingState {
    return { ...this.state };
  }
}

export const trackingBridge = TrackingServiceBridge.getInstance();
