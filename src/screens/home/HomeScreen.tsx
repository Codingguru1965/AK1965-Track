import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MetricTile } from '../../components/MetricTile';
import { ActivityType, Activity } from '../../types';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { syncService } from '../../services/sync/syncService';
import { LocationFilter } from '../../services/tracking/locationFilter';

interface HomeScreenProps {
  navigation: any;
  user?: {
    username: string;
    email: string;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, user: propUser }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    todayDistanceKm: 0,
    weekDistanceKm: 0,
    weekCount: 0,
    totalCalories: 0,
    totalDurationSec: 0,
    avgPaceSec: 0,
  });

  const username = propUser?.username || authUser?.username || 'Athlete';
  const userId = authUser?.id || 'guest_user';

  const loadData = useCallback(() => {
    try {
      const dbActivities = ActivityRepository.getByUserId(userId, 5);
      setActivities(dbActivities);

      const dbStats = ActivityRepository.getStats(userId);
      
      // Calculate total calories and avg pace for completed activities
      let totalCal = 0;
      let totalDist = 0;
      let totalDur = 0;
      for (const act of dbActivities) {
        totalCal += act.calories;
        totalDist += act.distance;
        totalDur += act.duration;
      }

      setStats({
        todayDistanceKm: (dbStats.todayDistance || 0) / 1000,
        weekDistanceKm: (dbStats.thisWeekDistance || 0) / 1000,
        weekCount: dbStats.thisWeekActivitiesCount || 0,
        totalCalories: totalCal,
        totalDurationSec: totalDur,
        avgPaceSec: totalDist > 0 ? LocationFilter.calculatePace(totalDur, totalDist) : 0,
      });
    } catch (e) {
      console.error('[HomeScreen] Error loading data:', e);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncService.triggerSync();
      loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'running': return '🏃';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
    }
  };

  const formatDurationShort = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${totalSec % 60}s`;
  };

  const formatActivityDate = (timestamp: number) => {
    const actDate = new Date(timestamp);
    const today = new Date();
    const isToday =
      actDate.getDate() === today.getDate() &&
      actDate.getMonth() === today.getMonth() &&
      actDate.getFullYear() === today.getFullYear();

    const timeStr = actDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${actDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${getTimeGreeting()}, ${username} 👋`}
        subtitle="Ready to crush your goals today?"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={[styles.profileAvatar, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
            activeOpacity={0.7}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.avatarImg}
            />
          </TouchableOpacity>
        }
      />

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

        {/* Weekly Distance Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[typography.metricLabel, { color: colors.primary }]}>
                This Week's Effort
              </Text>
              <Text style={[typography.metricValue, { color: colors.text, marginTop: 4 }]}>
                {stats.weekDistanceKm.toFixed(2)} <Text style={[typography.h3, { color: colors.textSecondary }]}>KM</Text>
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
              <Text style={[typography.badge, { color: colors.primary }]}>
                {stats.weekCount} {stats.weekCount === 1 ? 'Activity' : 'Activities'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricGrid}>
            <MetricTile
              label="Today"
              value={stats.todayDistanceKm.toFixed(2)}
              unit="km"
              icon="⚡"
              highlight
            />
            <MetricTile
              label="Calories"
              value={stats.totalCalories.toString()}
              unit="kcal"
              icon="🔥"
            />
          </View>
          <View style={styles.metricGrid}>
            <MetricTile
              label="Active Time"
              value={formatDurationShort(stats.totalDurationSec)}
              icon="⏱️"
            />
            <MetricTile
              label="Avg Pace"
              value={stats.avgPaceSec > 0 ? LocationFilter.formatPace(stats.avgPaceSec) : "--'--\""}
              unit="/km"
              icon="🎯"
            />
          </View>
        </Card>

        {/* Big Athletic Quick Start Button */}
        <Button
          title="START ACTIVITY"
          onPress={() => navigation.navigate('ActivitySelect')}
          variant="primary"
          style={styles.startBtn}
          textStyle={{ fontSize: 17, letterSpacing: 1 }}
        />

        {/* Activity Quick Launchers */}
        <View style={styles.quickLaunchRow}>
          <TouchableOpacity
            style={[styles.quickLaunchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LiveActivity', { activityType: 'running' })}>
            <Text style={styles.quickLaunchIcon}>🏃</Text>
            <Text style={[typography.button, { color: colors.text, fontSize: 13 }]}>Run</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLaunchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LiveActivity', { activityType: 'walking' })}>
            <Text style={styles.quickLaunchIcon}>🚶</Text>
            <Text style={[typography.button, { color: colors.text, fontSize: 13 }]}>Walk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLaunchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LiveActivity', { activityType: 'cycling' })}>
            <Text style={styles.quickLaunchIcon}>🚴</Text>
            <Text style={[typography.button, { color: colors.text, fontSize: 13 }]}>Cycle</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities Section */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Recent Activities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
              See All →
            </Text>
          </TouchableOpacity>
        </View>

        {activities.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🏃</Text>
            <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '700' }]}>
              No workouts recorded yet
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Tap "START ACTIVITY" above to track your first GPS workout offline!
            </Text>
          </Card>
        ) : (
          activities.map((item) => (
            <Card
              key={item.id}
              onPress={() => navigation.navigate('History')}
              style={styles.activityCard}>
              <View style={styles.activityRow}>
                <View style={[styles.typeIconContainer, { backgroundColor: colors.cardSecondary }]}>
                  <Text style={{ fontSize: 24 }}>{getActivityIcon(item.activityType)}</Text>
                </View>

                <View style={styles.activityDetails}>
                  <Text style={[typography.h3, { color: colors.text }]}>
                    {item.activityType.charAt(0).toUpperCase() + item.activityType.slice(1)}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {formatActivityDate(item.startTime)}
                  </Text>
                </View>

                <View style={styles.activityMetrics}>
                  <Text style={[typography.h3, { color: colors.primary }]}>
                    {(item.distance / 1000).toFixed(2)}{' '}
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>km</Text>
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {item.activityType === 'cycling'
                      ? `${(item.averageSpeed * 3.6).toFixed(1)} km/h`
                      : LocationFilter.formatPace(item.averagePace)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
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
    paddingTop: 8,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroCard: {
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  startBtn: {
    height: 58,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickLaunchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickLaunchCard: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLaunchIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 10,
    paddingVertical: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityDetails: {
    flex: 1,
  },
  activityMetrics: {
    alignItems: 'flex-end',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
});
