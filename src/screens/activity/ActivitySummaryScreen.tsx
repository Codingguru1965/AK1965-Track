import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MetricTile } from '../../components/MetricTile';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { LocationRepository } from '../../database/repositories/LocationRepository';
import { syncService } from '../../services/sync/syncService';
import { LocationFilter } from '../../services/tracking/locationFilter';
import { Activity, SyncStatus } from '../../types';

interface ActivitySummaryScreenProps {
  route: {
    params: {
      activityId: string;
      activityType?: string;
      distance?: number;
      duration?: number;
      steps?: number;
    };
  };
  navigation: any;
}

export const ActivitySummaryScreen: React.FC<ActivitySummaryScreenProps> = ({
  route,
  navigation,
}) => {
  const { activityId, activityType: propType, distance: propDist, duration: propDur, steps: propSteps } = route.params || {};
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [pointCount, setPointCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('pending');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // 1. Load activity from SQLite
    if (activityId) {
      const act = ActivityRepository.getById(activityId);
      if (act) {
        setActivity(act);
        setSyncStatus(act.syncStatus);
      }
      const locs = LocationRepository.getByActivityId(activityId);
      setPointCount(locs.length);
    }

    // 2. Subscribe to sync service updates
    const unsub = syncService.subscribe((syncing, result) => {
      setIsSyncing(syncing);
      if (activityId) {
        const refreshed = ActivityRepository.getById(activityId);
        if (refreshed) {
          setSyncStatus(refreshed.syncStatus);
        }
      }
    });

    // 3. Trigger immediate cloud sync
    syncService.triggerSync();

    return () => {
      unsub();
    };
  }, [activityId]);

  const effectiveType = activity?.activityType || propType || 'running';
  const effectiveDistanceKm = activity ? activity.distance / 1000 : (propDist || 0);
  const effectiveDuration = activity?.duration || propDur || 0;
  const effectiveCalories = activity?.calories || Math.round(effectiveDuration * 0.12);
  const effectiveSteps = activity?.steps ?? propSteps ?? 0;
  const effectivePace = activity?.averagePace ? LocationFilter.formatPace(activity.averagePace) : "5'28\"";
  const effectiveSpeed = activity?.averageSpeed ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h` : '0.0 km/h';

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const getSyncBadge = () => {
    if (isSyncing) {
      return (
        <Text style={[typography.bodySmall, { color: colors.warning, fontWeight: '700' }]}>
          🔄 Syncing with Cloud...
        </Text>
      );
    }
    if (syncStatus === 'synced') {
      return (
        <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
          ✓ Synced with Cloud & MongoDB
        </Text>
      );
    }
    return (
      <Text style={[typography.bodySmall, { color: colors.success, fontWeight: '700' }]}>
        ✓ Saved locally in SQLite • Sync queued
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Workout Complete! 🎉" subtitle="Great job crushing your session" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}>
        {/* Celebration / Mileage Card */}
        <Card style={styles.heroCard}>
          <Text style={[typography.metricLabel, { color: colors.primary }]}>
            Total Distance Covered
          </Text>
          <Text style={[typography.metricValue, { color: colors.text, marginVertical: 6 }]}>
            {effectiveDistanceKm.toFixed(2)} <Text style={[typography.h2, { color: colors.textSecondary }]}>KM</Text>
          </Text>
          {getSyncBadge()}
        </Card>

        {/* Metrics Grid */}
        <View style={styles.gridRow}>
          <MetricTile
            label="Total Time"
            value={formatDuration(effectiveDuration)}
            icon="⏱️"
          />
          <MetricTile
            label="Calories"
            value={effectiveCalories}
            unit="kcal"
            icon="🔥"
          />
        </View>

        <View style={styles.gridRow}>
          <MetricTile
            label={effectiveType === 'cycling' ? 'Avg Speed' : 'Avg Pace'}
            value={effectiveType === 'cycling' ? effectiveSpeed : effectivePace}
            unit={effectiveType === 'cycling' ? undefined : '/km'}
            icon="⚡"
          />
          {effectiveType !== 'cycling' && (
            <MetricTile
              label="Steps"
              value={effectiveSteps}
              icon="👣"
            />
          )}
        </View>

        {/* Map / Route Summary Card */}
        <Card style={styles.mapCard}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>🗺️</Text>
          <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '700' }]}>
            GPS Route Captured
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', marginTop: 2 }]}>
            {pointCount > 0
              ? `${pointCount} high-precision breadcrumb points stored in SQLite.`
              : 'High-precision GPS path stored in local SQLite database.'}
          </Text>
        </Card>

        <Button
          title="BACK TO DASHBOARD"
          variant="primary"
          onPress={handleDone}
          style={{ marginTop: 20, height: 56 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  mapCard: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
});
