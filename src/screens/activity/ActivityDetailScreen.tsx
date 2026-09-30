import React from 'react';
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
import { MetricTile } from '../../components/MetricTile';

interface ActivityDetailScreenProps {
  route: {
    params: {
      activityId: string;
    };
  };
  navigation: any;
}

export const ActivityDetailScreen: React.FC<ActivityDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { activityId } = route.params;
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  // Detail data
  const activity = {
    id: activityId,
    type: 'Running',
    distance: 5.24,
    duration: '28m 40s',
    pace: "5'28\" /km",
    speed: '10.9 km/h',
    calories: 342,
    steps: 5420,
    startTime: 'Today, 07:15 AM',
    endTime: 'Today, 07:44 AM',
    syncStatus: 'Synced to Cloud',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${activity.type} Details`}
        subtitle={activity.startTime}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={[typography.metricLabel, { color: colors.primary }]}>
            Workout Distance
          </Text>
          <Text style={[typography.metricValue, { color: colors.text, marginVertical: 4 }]}>
            {activity.distance} <Text style={[typography.h3, { color: colors.textSecondary }]}>KM</Text>
          </Text>
          <View style={[styles.syncPill, { backgroundColor: colors.badgeBackground }]}>
            <Text style={[typography.badge, { color: colors.primary }]}>
              ✓ {activity.syncStatus}
            </Text>
          </View>
        </Card>

        {/* Map / Route area */}
        <Card style={styles.mapCard}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>📍</Text>
          <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '700' }]}>
            Recorded GPS Route
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
            Interactive polyline with start/stop markers rendered via Google Maps.
          </Text>
        </Card>

        {/* Metric Grid */}
        <View style={styles.gridRow}>
          <MetricTile
            label="Duration"
            value={activity.duration}
            icon="⏱️"
          />
          <MetricTile
            label="Avg Pace"
            value={activity.pace}
            icon="⚡"
          />
        </View>

        <View style={styles.gridRow}>
          <MetricTile
            label="Calories"
            value={activity.calories}
            unit="kcal"
            icon="🔥"
          />
          <MetricTile
            label="Steps"
            value={activity.steps}
            icon="👣"
          />
        </View>

        {/* Session Time Breakdown Card */}
        <Card style={styles.sessionCard}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>
            Session Details
          </Text>
          <View style={styles.detailLine}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Started</Text>
            <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>{activity.startTime}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailLine}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Ended</Text>
            <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>{activity.endTime}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailLine}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Storage Location</Text>
            <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '600' }]}>SQLite (Local) + MongoDB</Text>
          </View>
        </Card>
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
    paddingTop: 14,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  syncPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  mapCard: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  gridRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  sessionCard: {
    padding: 16,
    marginTop: 10,
  },
  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
