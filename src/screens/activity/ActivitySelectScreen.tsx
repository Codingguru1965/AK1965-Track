import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ActivityType } from '../../types';

interface ActivitySelectScreenProps {
  navigation: any;
}

export const ActivitySelectScreen: React.FC<ActivitySelectScreenProps> = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<ActivityType>('running');

  const activities: { type: ActivityType; name: string; icon: string; desc: string }[] = [
    {
      type: 'running',
      name: 'Running',
      icon: '🏃',
      desc: 'Tracks pace, distance, steps, and high-intensity calorie burn.',
    },
    {
      type: 'walking',
      name: 'Walking',
      icon: '🚶',
      desc: 'Tracks steps, steady distance, pace, and active walking time.',
    },
    {
      type: 'cycling',
      name: 'Cycling',
      icon: '🚴',
      desc: 'Tracks cycling speed, elevation, distance, and endurance metrics.',
    },
  ];

  const handleStart = () => {
    navigation.navigate('LiveActivity', { activityType: selectedType });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Start Workout"
        subtitle="Select your sport"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}>
        <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>
          Choose Activity Type
        </Text>

        {activities.map((item) => {
          const isSelected = selectedType === item.type;
          return (
            <Card
              key={item.type}
              onPress={() => setSelectedType(item.type)}
              style={{
                borderColor: isSelected ? colors.primary : colors.border,
                borderWidth: isSelected ? 2 : 1,
                backgroundColor: isSelected ? colors.badgeBackground : colors.card,
                marginVertical: 8,
                padding: 18,
              }}>
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                    },
                  ]}>
                  <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                </View>

                <View style={styles.textBox}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        typography.h3,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}

        <View style={styles.bottomSection}>
          <Button
            title={`START ${selectedType.toUpperCase()}`}
            onPress={handleStart}
            variant="primary"
            style={{ height: 56 }}
            textStyle={{ letterSpacing: 1 }}
          />
        </View>
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
    flexGrow: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 24,
  },
});
