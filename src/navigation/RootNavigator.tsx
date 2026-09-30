import React, { useEffect } from 'react';
import {
  BackHandler,
  ToastAndroid,
  Platform,
  View,
  ActivityIndicator,
  Image,
  Text,
  StyleSheet,
} from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ActivitySelectScreen } from '../screens/activity/ActivitySelectScreen';
import { LiveActivityScreen } from '../screens/activity/LiveActivityScreen';
import { ActivitySummaryScreen } from '../screens/activity/ActivitySummaryScreen';
import { ActivityDetailScreen } from '../screens/activity/ActivityDetailScreen';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, isDark, typography } = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const navigationRef = useNavigationContainerRef();

  // Strict Android hardware back button handling
  useEffect(() => {
    let lastBackPressed = 0;

    const onBackPress = () => {
      // 1. If inside a nested stack/screen, go back in history
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      // 2. If at root screen (Home or Login), require double-tap to exit
      const now = Date.now();
      if (now - lastBackPressed < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressed = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit AK1965 Track', ToastAndroid.SHORT);
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigationRef]);

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const,
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700' as const,
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900' as const,
      },
    },
  };

  // Splash / Loading state while restoring secure session
  if (isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={[typography.h1, { color: colors.text, marginTop: 16 }]}>
          AK1965 <Text style={{ color: colors.primary }}>TRACK</Text>
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6 }]}>
          🏃 Running • 🚶 Walking • 🚴 Cycling
        </Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 32 }}
        />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="ActivitySelect"
              component={ActivitySelectScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="LiveActivity"
              component={LiveActivityScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ActivitySummary"
              component={ActivitySummaryScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ActivityDetail"
              component={ActivityDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 110,
    height: 110,
    borderRadius: 24,
  },
});
