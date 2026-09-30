import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  highlight?: boolean;
  style?: ViewStyle;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  icon,
  highlight = false,
  style,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.card,
          borderColor: highlight ? colors.primary : colors.border,
        },
        style,
      ]}>
      <View style={styles.topRow}>
        <Text style={[typography.metricLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[
            typography.metricValue,
            { color: highlight ? colors.primary : colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: colors.textSecondary }]}>
            {' '}{unit}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flex: 1,
    margin: 4,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
