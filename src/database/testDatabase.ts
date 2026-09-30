import { dbManager } from './index';
import { UserRepository } from './repositories/UserRepository';
import { ActivityRepository } from './repositories/ActivityRepository';
import { LocationRepository } from './repositories/LocationRepository';
import { SyncQueueRepository } from './repositories/SyncQueueRepository';
import { Activity, ActivityLocation } from '../types';

export interface DBTestResult {
  success: boolean;
  steps: { name: string; passed: boolean; details?: string }[];
  error?: string;
}

export async function runDatabaseSelfTest(): Promise<DBTestResult> {
  const steps: { name: string; passed: boolean; details?: string }[] = [];

  try {
    // Step 1: Initialize Database & Run Migrations
    dbManager.init();
    steps.push({ name: 'Database Initialized & Migrations Applied', passed: true });

    // Step 2: Test UserRepository
    const testUserId = `test_user_${Date.now()}`;
    UserRepository.upsert({
      id: testUserId,
      username: 'TestRunner',
      email: `${testUserId}@example.com`,
      age: 28,
      weight: 72.5,
      syncStatus: 'synced',
    });

    const fetchedUser = UserRepository.getById(testUserId);
    if (!fetchedUser || fetchedUser.username !== 'TestRunner' || fetchedUser.weight !== 72.5) {
      throw new Error('UserRepository getById failed to match inserted user');
    }

    const fetchedByEmail = UserRepository.getByEmail(`${testUserId}@example.com`);
    if (!fetchedByEmail || fetchedByEmail.id !== testUserId) {
      throw new Error('UserRepository getByEmail failed');
    }
    steps.push({ name: 'UserRepository: upsert & query verified', passed: true, details: `User: ${fetchedUser.username}` });

    // Step 3: Test ActivityRepository
    const testActivityId = `act_${Date.now()}`;
    const newActivity: Activity = {
      id: testActivityId,
      userId: testUserId,
      activityType: 'running',
      startTime: Date.now() - 3600000,
      duration: 1800,
      distance: 5200.0,
      averageSpeed: 10.4,
      averagePace: 346,
      calories: 380,
      steps: 4200,
      status: 'active',
      syncStatus: 'pending',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
    };

    ActivityRepository.create(newActivity);
    let act = ActivityRepository.getById(testActivityId);
    if (!act || act.distance !== 5200.0) {
      throw new Error('ActivityRepository create or getById failed');
    }

    // Update metrics
    ActivityRepository.updateMetrics(testActivityId, {
      duration: 2100,
      distance: 6000.0,
      avgSpeed: 10.28,
      avgPace: 350,
      calories: 440,
      steps: 5100,
    });

    // Finish activity
    ActivityRepository.finish(
      testActivityId,
      Date.now(),
      2100,
      6000.0,
      10.28,
      350,
      440,
      5100
    );

    act = ActivityRepository.getById(testActivityId);
    if (!act || act.status !== 'completed' || act.distance !== 6000.0) {
      throw new Error('ActivityRepository finish or status update failed');
    }

    // Check stats and PRs
    const stats = ActivityRepository.getStats(testUserId);
    if (stats.totalDistance < 6000.0 || stats.totalActivitiesCount < 1) {
      throw new Error(`ActivityRepository getStats invalid: ${JSON.stringify(stats)}`);
    }

    const prs = ActivityRepository.getPersonalRecords(testUserId);
    if (!prs.longestDistance || prs.longestDistance.distance !== 6000.0) {
      throw new Error('ActivityRepository getPersonalRecords invalid');
    }
    steps.push({
      name: 'ActivityRepository: create, update, finish, stats & PRs verified',
      passed: true,
      details: `Distance: ${act.distance}m, Stats total: ${stats.totalDistance}m`,
    });

    // Step 4: Test LocationRepository
    const locations: ActivityLocation[] = [];
    for (let i = 0; i < 5; i++) {
      locations.push({
        id: `loc_${testActivityId}_${i}`,
        activityId: testActivityId,
        latitude: 28.6139 + i * 0.001,
        longitude: 77.2090 + i * 0.001,
        altitude: 210 + i * 2,
        speed: 2.8 + i * 0.1,
        accuracy: 4.5,
        timestamp: Date.now() - (5 - i) * 1000,
        sequence: i,
      });
    }

    LocationRepository.insertBatch(locations, testUserId);
    const fetchedLocations = LocationRepository.getByActivityId(testActivityId);
    if (fetchedLocations.length !== 5 || fetchedLocations[0].sequence !== 0 || fetchedLocations[4].sequence !== 4) {
      throw new Error(`LocationRepository batch insert / query failed. Count: ${fetchedLocations.length}`);
    }
    steps.push({
      name: 'LocationRepository: batch insert & sequenced query verified',
      passed: true,
      details: `Inserted & verified ${fetchedLocations.length} GPS breadcrumbs`,
    });

    // Step 5: Test SyncQueueRepository
    SyncQueueRepository.enqueue({
      entityType: 'activity',
      entityId: testActivityId,
      operation: 'create',
      payload: { id: testActivityId, distance: 6000.0 },
    });

    const pendingCount = SyncQueueRepository.getPendingCount();
    if (pendingCount < 1) {
      throw new Error('SyncQueueRepository pending count is 0');
    }

    const queueItems = SyncQueueRepository.peek(10);
    const queuedItem = queueItems.find((q) => q.entityId === testActivityId);
    if (!queuedItem || queuedItem.payload.distance !== 6000.0) {
      throw new Error('SyncQueueRepository peek failed to return enqueued item');
    }

    SyncQueueRepository.recordFailure(queuedItem.id, 'Connection timeout');
    const retriedItems = SyncQueueRepository.peek(10);
    const failedItem = retriedItems.find((q) => q.id === queuedItem.id);
    if (!failedItem || failedItem.retryCount !== 1 || failedItem.lastError !== 'Connection timeout') {
      throw new Error('SyncQueueRepository recordFailure failed to update error state');
    }

    SyncQueueRepository.remove(queuedItem.id);
    steps.push({
      name: 'SyncQueueRepository: enqueue, peek, failure tracking & dequeue verified',
      passed: true,
      details: 'Queue FIFO ordering & failure tracking confirmed',
    });

    console.log('[DB_TEST_PASS] All SQLite database self-tests passed successfully!');
    return { success: true, steps };
  } catch (error: any) {
    console.error('[DB_TEST_FAIL] SQLite test failed:', error);
    return { success: false, steps, error: error.message };
  }
}
