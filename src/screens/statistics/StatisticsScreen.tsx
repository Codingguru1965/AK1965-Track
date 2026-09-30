import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MetricTile } from '../../components/MetricTile';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { dbManager } from '../../database/index';
import { syncService } from '../../services/sync/syncService';
import { LocationFilter } from '../../services/tracking/locationFilter';

interface StatisticsScreenProps {
  navigation: any;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = () => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || 'guest_user';

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDistanceKm: 0,
    totalActivities: 0,
    totalDurationSec: 0,
    totalCalories: 0,
    weekDistanceKm: 0,
    monthDistanceKm: 0,
  });

  const [breakdown, setBreakdown] = useState({
    running: { distanceKm: 0, count: 0 },
    walking: { distanceKm: 0, count: 0 },
    cycling: { distanceKm: 0, count: 0 },
  });

  const [pr, setPr] = useState<any>(null);

  const loadStatistics = useCallback(() => {
    try {
      const summary = ActivityRepository.getStats(userId);
      const records = ActivityRepository.getPersonalRecords(userId);
      setPr(records);

      // Month distance (from start of current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthRes = dbManager.execute(
        `SELECT COALESCE(SUM(distance), 0) AS distance 
         FROM activities 
         WHERE user_id = ? AND status = 'completed' AND start_time >= ?;`,
        [userId, startOfMonth]
      );
      const monthDist = Number(monthRes.rows?.[0]?.distance || 0);

      // Total calories
      const calRes = dbManager.execute(
        `SELECT COALESCE(SUM(calories), 0) AS calories 
         FROM activities 
         WHERE user_id = ? AND status = 'completed';`,
        [userId]
      );
      const totalCal = Number(calRes.rows?.[0]?.calories || 0);

      setStats({
        totalDistanceKm: summary.totalDistance / 1000,
        totalActivities: summary.totalActivitiesCount,
        totalDurationSec: summary.totalDurationSeconds,
        totalCalories: totalCal,
        weekDistanceKm: summary.thisWeekDistance / 1000,
        monthDistanceKm: monthDist / 1000,
      });

      // Activity Breakdown by type
      const bdRes = dbManager.execute(
        `SELECT activity_type, COALESCE(SUM(distance), 0) AS dist, COUNT(*) AS cnt 
         FROM activities 
         WHERE user_id = ? AND status = 'completed' 
         GROUP BY activity_type;`,
        [userId]
      );

      const bd = {
        running: { distanceKm: 0, count: 0 },
        walking: { distanceKm: 0, count: 0 },
        cycling: { distanceKm: 0, count: 0 },
      };

      if (bdRes.rows) {
        for (const row of bdRes.rows) {
          const type = row.activity_type as 'running' | 'walking' | 'cycling';
          if (bd[type]) {
            bd[type] = {
              distanceKm: Number(row.dist || 0) / 1000,
              count: Number(row.cnt || 0),
            };
          }
        }
      }
      setBreakdown(bd);
    } catch (e) {
      console.error('[StatisticsScreen] Error loading statistics:', e);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [loadStatistics])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncService.triggerSync();
      loadStatistics();
    } finally {
      setRefreshing(false);
    }
  };

  const formatHoursMinutes = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Statistics" subtitle="Your performance insights & records" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {/* Lifetime Totals Banner */}
        <Card style={styles.lifetimeCard}>
          <Text style={[typography.metricLabel, { color: colors.primary }]}>
            All-Time Mileage
          </Text>
          <Text style={[typography.metricValue, { color: colors.text, marginVertical: 4 }]}>
            {stats.totalDistanceKm.toFixed(2)} <Text style={[typography.h3, { color: colors.textSecondary }]}>KM</Text>
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.lifetimeRow}>
            <View style={styles.lifetimeCol}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Activities</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{stats.totalActivities}</Text>
            </View>
            <View style={styles.lifetimeCol}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Total Time</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{formatHoursMinutes(stats.totalDurationSec)}</Text>
            </View>
            <View style={styles.lifetimeCol}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Calories</Text>
              <Text style={[typography.h3, { color: colors.primary }]}>{stats.totalCalories.toLocaleString()}</Text>
            </View>
          </View>
        </Card>

        {/* Time Periods Breakdown */}
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
          Period Comparison
        </Text>
        <View style={styles.tileRow}>
          <MetricTile
            label="This Week"
            value={stats.weekDistanceKm.toFixed(2)}
            unit="km"
            icon="📅"
            highlight
          />
          <MetricTile
            label="This Month"
            value={stats.monthDistanceKm.toFixed(2)}
            unit="km"
            icon="📆"
          />
        </View>

        {/* Activity Breakdown */}
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
          Activity Breakdown
        </Text>
        <Card>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 24 }}>🏃</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: 4 }]}>
                {breakdown.running.distanceKm.toFixed(1)} km
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {breakdown.running.count} {breakdown.running.count === 1 ? 'Run' : 'Runs'}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 24 }}>🚶</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: 4 }]}>
                {breakdown.walking.distanceKm.toFixed(1)} km
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {breakdown.walking.count} {breakdown.walking.count === 1 ? 'Walk' : 'Walks'}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 24 }}>🚴</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: 4 }]}>
                {breakdown.cycling.distanceKm.toFixed(1)} km
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {breakdown.cycling.count} {breakdown.cycling.count === 1 ? 'Ride' : 'Rides'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Personal Records */}
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
          Personal Records 🏆
        </Text>
        <Card style={styles.prCard}>
          <View style={styles.prRow}>
            <Text style={{ fontSize: 22 }}>🥇</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Longest Distance</Text>
              <Text style={[typography.h3, { color: colors.text }]}>
                {pr?.longestDistance
                  ? `${(pr.longestDistance.distance / 1000).toFixed(2)} km (${pr.longestDistance.type})`
                  : 'No completed record yet'}
              </Text>
            </View>
          </View>

          <View style={[styles.prDivider, { backgroundColor: colors.border }]} />

          <View style={styles.prRow}>
            <Text style={{ fontSize: 22 }}>⚡</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Fastest Pace (Running)</Text>
              <Text style={[typography.h3, { color: colors.text }]}>
                {pr?.fastestPaceRunning
                  ? `${LocationFilter.formatPace(pr.fastestPaceRunning.pace)} (${(pr.fastestPaceRunning.distance / 1000).toFixed(1)} km)`
                  : 'No completed record yet'}
              </Text>
            </View>
          </View>

          <View style={[styles.prDivider, { backgroundColor: colors.border }]} />

          <View style={styles.prRow}>
            <Text style={{ fontSize: 22 }}>🚀</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Top Speed (Cycling)</Text>
              <Text style={[typography.h3, { color: colors.text }]}>
                {pr?.highestSpeedCycling
                  ? `${(pr.highestSpeedCycling.speed * 3.6).toFixed(1)} km/h`
                  : 'No completed record yet'}
              </Text>
            </View>
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
    paddingTop: 12,
  },
  lifetimeCard: {
    padding: 20,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  lifetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lifetimeCol: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tileRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  prCard: {
    padding: 16,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prDivider: {
    height: 1,
    marginVertical: 8,
  },
});
