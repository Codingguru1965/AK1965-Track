import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ActivityType, GPSStatus } from '../../types';
import { trackingBridge, LiveTrackingState } from '../../services/tracking/trackingServiceBridge';
import { PermissionManager } from '../../services/permissions/permissionManager';
import { LocationFilter } from '../../services/tracking/locationFilter';

interface LiveActivityScreenProps {
  route: {
    params: {
      activityType: ActivityType;
    };
  };
  navigation: any;
}

export const LiveActivityScreen: React.FC<LiveActivityScreenProps> = ({
  route,
  navigation,
}) => {
  const { activityType } = route.params;
  const { colors, typography } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [trackingState, setTrackingState] = useState<LiveTrackingState>(trackingBridge.getState());
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Initialize tracking session
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initTracking = async () => {
      // 1. Request Android permissions
      const perms = await PermissionManager.requestTrackingPermissions();
      if (!perms.locationGranted) {
        setPermissionError('Location permission is required to track your workout.');
        Alert.alert(
          'Location Required',
          'Please allow location access to record GPS routes and distance.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Request background location for screen-off tracking
      PermissionManager.requestBackgroundLocationPermission();

      // 2. Start tracking session
      const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const userId = user?.id || 'guest_user';
      const userWeight = user?.weight || 70.0;

      await trackingBridge.startTracking(activityId, userId, activityType, userWeight);

      // 3. Subscribe to real-time state changes
      unsubscribe = trackingBridge.subscribe((newState) => {
        setTrackingState(newState);
      });
    };

    initTracking();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Format mm:ss or hh:mm:ss
  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getActivityIcon = () => {
    switch (activityType) {
      case 'running': return '🏃';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      default: return '🏃';
    }
  };

  const getGpsStatusColor = (status: GPSStatus) => {
    switch (status) {
      case 'active': return colors.success;
      case 'weak': return '#FF9100';
      case 'searching': return colors.warning;
      case 'unavailable': return colors.error;
    }
  };

  const getGpsStatusLabel = (status: GPSStatus, accuracy: number) => {
    switch (status) {
      case 'active': return `GPS Strong (±${accuracy.toFixed(0)}m)`;
      case 'weak': return `GPS Weak (±${accuracy.toFixed(0)}m)`;
      case 'searching': return 'Searching GPS...';
      case 'unavailable': return 'GPS Offline';
    }
  };

  const handlePause = async () => {
    await trackingBridge.pauseTracking();
  };

  const handleResume = async () => {
    await trackingBridge.resumeTracking();
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout',
      'Are you ready to complete and save this workout session?',
      [
        { text: 'Resume', style: 'cancel' },
        {
          text: 'Finish & Save',
          style: 'default',
          onPress: async () => {
            const completedActivity = await trackingBridge.stopTracking();
            navigation.replace('ActivitySummary', {
              activityId: completedActivity?.id || trackingState.activityId,
              activityType,
              distance: (completedActivity?.distance ?? trackingState.distance) / 1000,
              duration: completedActivity?.duration ?? trackingState.duration,
              steps: completedActivity?.steps ?? trackingState.steps,
            });
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout? No data will be saved.',
      [
        { text: 'Keep Workout', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await trackingBridge.stopTracking();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const distanceKm = trackingState.distance / 1000;
  const isPaused = trackingState.status === 'paused';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Row with GPS Status & Activity Indicator */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View style={styles.activityBadge}>
          <Text style={{ fontSize: 24 }}>{getActivityIcon()}</Text>
          <Text style={[typography.h3, { color: colors.text, marginLeft: 8, textTransform: 'capitalize' }]}>
            {activityType}
          </Text>
        </View>

        <View style={[styles.gpsBadge, { backgroundColor: colors.cardSecondary }]}>
          <View style={[styles.gpsDot, { backgroundColor: getGpsStatusColor(trackingState.gpsStatus) }]} />
          <Text style={[typography.badge, { color: colors.textSecondary }]}>
            {getGpsStatusLabel(trackingState.gpsStatus, trackingState.currentAccuracy)}
          </Text>
        </View>
      </View>

      {/* Screen-off Notification Banner */}
      <View style={[styles.infoBanner, { backgroundColor: 'rgba(0, 230, 118, 0.12)', borderColor: colors.primary }]}>
        <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
          ⚡ Foreground Service Active • Tracks when screen is locked
        </Text>
      </View>

      {/* Main Map or Offline Route Display Area */}
      <View style={[styles.mapContainer, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
        <View style={styles.mapCenterBox}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📍</Text>
          <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '700' }]}>
            High-Precision GPS Trail
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
            {trackingState.lastLocation
              ? `Lat: ${trackingState.lastLocation.latitude.toFixed(5)}, Lon: ${trackingState.lastLocation.longitude.toFixed(5)}`
              : 'Acquiring satellite lock...'}
            {'\n'}Points buffered & batch-persisted to local SQLite.
          </Text>
        </View>
      </View>

      {/* Primary Metrics Board */}
      <View style={styles.metricsContainer}>
        {/* Main Big Metric: Distance */}
        <View style={styles.distanceBox}>
          <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>Distance</Text>
          <View style={styles.bigValueRow}>
            <Text style={[styles.hugeDistance, { color: colors.primary }]}>
              {distanceKm.toFixed(2)}
            </Text>
            <Text style={[typography.h2, { color: colors.textSecondary, marginLeft: 6 }]}>
              KM
            </Text>
          </View>
        </View>

        {/* Secondary Metrics Grid */}
        <View style={styles.gridRow}>
          <Card style={styles.miniCard}>
            <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[typography.h2, { color: colors.text }]}>
              {formatDuration(trackingState.duration)}
            </Text>
          </Card>

          <Card style={styles.miniCard}>
            <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>
              {activityType === 'cycling' ? 'Speed' : 'Avg Pace'}
            </Text>
            <Text style={[typography.h2, { color: colors.text }]}>
              {activityType === 'cycling'
                ? `${trackingState.averageSpeed.toFixed(1)} km/h`
                : LocationFilter.formatPace(trackingState.averagePace)}
            </Text>
          </Card>
        </View>

        <View style={styles.gridRow}>
          <Card style={styles.miniCard}>
            <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>Calories</Text>
            <Text style={[typography.h2, { color: colors.text }]}>
              {trackingState.calories} <Text style={{ fontSize: 13, color: colors.textSecondary }}>kcal</Text>
            </Text>
          </Card>

          {activityType !== 'cycling' ? (
            <Card style={styles.miniCard}>
              <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>Steps</Text>
              <Text style={[typography.h2, { color: colors.text }]}>{trackingState.steps}</Text>
            </Card>
          ) : (
            <Card style={styles.miniCard}>
              <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>Displacement</Text>
              <Text style={[typography.h2, { color: colors.text }]}>{Math.round(trackingState.distance)}m</Text>
            </Card>
          )}
        </View>
      </View>

      {/* Action Controls: Pause / Resume / Finish / Discard */}
      <View style={[styles.controlsArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        {!isPaused ? (
          <Button
            title="PAUSE"
            variant="secondary"
            onPress={handlePause}
            style={styles.controlBtn}
            textStyle={{ letterSpacing: 1 }}
          />
        ) : (
          <View>
            <View style={styles.pausedButtonsRow}>
              <Button
                title="RESUME"
                variant="primary"
                onPress={handleResume}
                style={[styles.halfBtn, { marginRight: 8 }]}
              />
              <Button
                title="FINISH"
                variant="danger"
                onPress={handleFinish}
                style={[styles.halfBtn, { marginLeft: 8 }]}
              />
            </View>
            <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
              <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
                Discard Workout
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  infoBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  mapContainer: {
    height: 140,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapCenterBox: {
    alignItems: 'center',
  },
  metricsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  distanceBox: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  bigValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hugeDistance: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1,
  },
  gridRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  miniCard: {
    flex: 1,
    margin: 4,
    padding: 10,
  },
  controlsArea: {
    marginTop: 'auto',
    paddingHorizontal: 16,
  },
  controlBtn: {
    height: 56,
  },
  pausedButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBtn: {
    flex: 1,
    height: 56,
  },
  discardBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
