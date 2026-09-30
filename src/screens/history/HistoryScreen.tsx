import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { ActivityType, Activity } from '../../types';
import { ActivityRepository } from '../../database/repositories/ActivityRepository';
import { syncService } from '../../services/sync/syncService';
import { LocationFilter } from '../../services/tracking/locationFilter';

interface HistoryScreenProps {
  navigation: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || 'guest_user';

  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityType>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = useCallback(() => {
    try {
      const all = ActivityRepository.getByUserId(userId, 100);
      setActivities(all);
    } catch (e) {
      console.error('[HistoryScreen] Error loading activities:', e);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncService.triggerSync();
      loadActivities();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = selectedFilter === 'all'
    ? activities
    : activities.filter((a) => a.activityType === selectedFilter);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'running': return '🏃';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
    }
  };

  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const formatActivityDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
  };

  const renderFilterChip = (key: 'all' | ActivityType, label: string) => {
    const isSelected = selectedFilter === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setSelectedFilter(key)}
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={[
            typography.button,
            {
              fontSize: 13,
              color: isSelected ? '#000000' : colors.textSecondary,
            },
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Activity History" subtitle="Your recorded workouts" />

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {renderFilterChip('all', 'All')}
        {renderFilterChip('running', '🏃 Run')}
        {renderFilterChip('walking', '🚶 Walk')}
        {renderFilterChip('cycling', '🚴 Cycle')}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
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
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
            <Text style={[typography.h3, { color: colors.text }]}>No activities found</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              {selectedFilter === 'all'
                ? 'Record your first workout from the Home screen!'
                : `No ${selectedFilter} workouts recorded yet.`}
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() =>
              navigation.navigate('ActivitySummary', {
                activityId: item.id,
                activityType: item.activityType,
                distance: item.distance / 1000,
                duration: item.duration,
                steps: item.steps,
              })
            }
            style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={[styles.typeIconBox, { backgroundColor: colors.cardSecondary }]}>
                <Text style={{ fontSize: 24 }}>{getActivityIcon(item.activityType)}</Text>
              </View>

              <View style={styles.mainInfo}>
                <View style={styles.headerLine}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[typography.h3, { color: colors.text, textTransform: 'capitalize' }]}>
                      {item.activityType}
                    </Text>
                    <View
                      style={[
                        styles.syncPill,
                        {
                          backgroundColor:
                            item.syncStatus === 'synced'
                              ? 'rgba(0, 230, 118, 0.15)'
                              : 'rgba(255, 171, 0, 0.15)',
                        },
                      ]}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: item.syncStatus === 'synced' ? colors.primary : colors.warning,
                        }}>
                        {item.syncStatus === 'synced' ? '✓ SYNCED' : 'OFFLINE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[typography.h2, { color: colors.primary }]}>
                    {(item.distance / 1000).toFixed(2)}{' '}
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>km</Text>
                  </Text>
                </View>

                <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 2 }]}>
                  {formatActivityDate(item.startTime)}
                </Text>

                <View style={[styles.statsLine, { borderColor: colors.border }]}>
                  <View style={styles.statCol}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>Time</Text>
                    <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                      {formatDuration(item.duration)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>Pace/Speed</Text>
                    <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                      {item.activityType === 'cycling'
                        ? `${(item.averageSpeed * 3.6).toFixed(1)} km/h`
                        : LocationFilter.formatPace(item.averagePace)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>Calories</Text>
                    <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                      {item.calories} kcal
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  itemCard: {
    padding: 14,
    marginVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
  },
  typeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mainInfo: {
    flex: 1,
  },
  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncPill: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statCol: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
});
