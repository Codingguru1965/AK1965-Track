import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { syncService } from '../../services/sync/syncService';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  const { colors, typography, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, isOfflineMode, isOnline } = useAuth();

  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(syncService.getPendingCount());

  useEffect(() => {
    return syncService.subscribe((syncing) => {
      setIsSyncingNow(syncing);
      setPendingSyncCount(syncService.getPendingCount());
    });
  }, []);

  const handleManualSync = async () => {
    const res = await syncService.triggerSync();
    setPendingSyncCount(syncService.getPendingCount());
    if (res.success) {
      Alert.alert(
        'Cloud Sync Successful',
        res.syncedCount > 0
          ? `Successfully uploaded ${res.syncedCount} workout(s) to cloud MongoDB.`
          : 'All workouts are already up-to-date in cloud!'
      );
    } else {
      Alert.alert('Sync Offline', res.error || 'Could not connect to cloud server.');
    }
  };

  const profileData = {
    username: user?.username || 'Athlete',
    email: user?.email || 'user@ak1965track.com',
    age: user?.age || 28,
    weight: user?.weight || 72,
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of AK1965 Track? Your local activity history will remain saved safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const renderThemeOption = (mode: ThemeMode, label: string) => {
    const isSelected = themeMode === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => setThemeMode(mode)}
        style={[
          styles.themeChip,
          {
            backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={[
            typography.button,
            {
              fontSize: 13,
              color: isSelected ? '#000000' : colors.text,
            },
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Profile" subtitle="Account & preferences" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.avatarImg}
            />
          </View>
          <Text style={[typography.h2, { color: colors.text, marginTop: 12 }]}>
            {profileData.username}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            {profileData.email}
          </Text>

          {/* Sync badge */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isOfflineMode
                  ? 'rgba(255, 171, 0, 0.15)'
                  : 'rgba(0, 230, 118, 0.12)',
              },
            ]}>
            <Text
              style={[
                typography.bodySmall,
                {
                  color: isOfflineMode ? colors.warning : colors.primary,
                  fontWeight: '700',
                  fontSize: 12,
                },
              ]}>
              {isOfflineMode
                ? '⚡ Offline Profile'
                : isOnline
                ? '☁️ Cloud Sync Active'
                : '☁️ Cloud Account (Offline)'}
            </Text>
          </View>

          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Age</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{profileData.age} yrs</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Weight</Text>
              <Text style={[typography.h3, { color: colors.primary }]}>{profileData.weight} kg</Text>
            </View>
          </View>
        </Card>

        {/* Theme Settings Card */}
        <Card style={styles.settingsCard}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 4 }]}>
            Theme & Appearance
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: 12 }]}>
            Choose your preferred color mode
          </Text>

          <View style={styles.themeRow}>
            {renderThemeOption('system', '📱 System')}
            {renderThemeOption('dark', '🌙 Dark')}
            {renderThemeOption('light', '☀️ Light')}
          </View>
        </Card>

        {/* SQLite Database Engine Status */}
        <Card style={styles.settingsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={[typography.h3, { color: colors.text }]}>
                Offline Database (SQLite)
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                High-performance WAL engine & repos
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(0, 230, 118, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
                ONLINE & ACTIVE
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 8, padding: 12, backgroundColor: colors.cardSecondary, borderRadius: 12 }}>
            <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
              📦 Schema Version: v1 (4 Tables Registered)
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12 }]}>
              • users: Profile cache & credentials{'\n'}
              • activities: Offline GPS workouts{'\n'}
              • activity_locations: Batch GPS coordinates{'\n'}
              • sync_queue: Offline mutations FIFO queue
            </Text>
          </View>
        </Card>

        {/* Cloud Synchronization Engine */}
        <Card style={styles.settingsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.h3, { color: colors.text }]}>
                Cloud Synchronization
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {pendingSyncCount > 0 ? `${pendingSyncCount} workout(s) waiting to sync` : 'All workouts synced with cloud'}
              </Text>
            </View>
            <View style={{ backgroundColor: isOnline ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 171, 0, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={[typography.bodySmall, { color: isOnline ? colors.primary : colors.warning, fontWeight: '700' }]}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <Button
            title={isSyncingNow ? 'SYNCING...' : 'SYNC WITH CLOUD NOW'}
            variant="outline"
            disabled={isSyncingNow}
            onPress={handleManualSync}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Calorie Info Notice */}
        <Card style={[styles.noticeCard, { backgroundColor: colors.cardSecondary }]}>
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            ℹ️ <Text style={{ fontWeight: '700', color: colors.text }}>Calorie Accuracy Note:</Text> Calories are estimates calculated from your age ({profileData.age}), weight ({profileData.weight}kg), duration, and exercise intensity.
          </Text>
        </Card>

        {/* Logout Button */}
        <Button
          title="Log Out"
          variant="danger"
          onPress={handleLogout}
          style={{ marginTop: 24 }}
        />

        <Text style={[typography.bodySmall, styles.versionText, { color: colors.textMuted }]}>
          AK1965 Track v1.0.0 (Build 1) • Production Architecture
        </Text>

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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  settingsCard: {
    marginTop: 14,
    padding: 18,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  noticeCard: {
    marginTop: 14,
    padding: 14,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 16,
  },
});
