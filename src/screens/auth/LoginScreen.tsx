import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, continueOffline, isOnline } = useAuth();

  const [email, setEmail] = useState('ankit@ak1965track.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOffline = async () => {
    Alert.alert(
      'Continue in Offline Mode?',
      'You can track runs, walks, and cycling completely offline without internet or an account. Your workouts will be saved locally on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Offline',
          onPress: async () => {
            await continueOffline();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 20, 40), paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* Brand Header with locked logo */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[typography.h1, styles.brandTitle, { color: colors.text }]}>
            AK1965 <Text style={{ color: colors.primary }}>TRACK</Text>
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            GPS Fitness & Activity Tracking
          </Text>

          {/* Network status pill */}
          <View
            style={[
              styles.networkBadge,
              {
                backgroundColor: isOnline
                  ? 'rgba(0, 230, 118, 0.12)'
                  : 'rgba(255, 171, 0, 0.15)',
              },
            ]}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isOnline ? colors.primary : colors.warning },
              ]}
            />
            <Text
              style={[
                typography.bodySmall,
                {
                  color: isOnline ? colors.primary : colors.warning,
                  fontWeight: '600',
                  fontSize: 12,
                },
              ]}>
              {isOnline ? 'Online • Cloud Sync Ready' : 'Offline • Local Storage Active'}
            </Text>
          </View>
        </View>

        {/* Login Form Card */}
        <Card style={styles.formCard}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>
            Sign In
          </Text>

          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(255, 82, 82, 0.12)' }]}>
              <Text style={[typography.bodySmall, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Text style={[typography.bodySmall, styles.inputLabel, { color: colors.textSecondary }]}>
            Email Address
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[typography.bodySmall, styles.inputLabel, { color: colors.textSecondary }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[typography.bodySmall, { color: colors.textMuted, marginHorizontal: 10 }]}>
              OR
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Button
            title="⚡ Continue in Offline Mode"
            variant="outline"
            onPress={handleContinueOffline}
            style={{ marginTop: 0 }}
          />

          <View style={styles.registerPrompt}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 10,
  },
  brandTitle: {
    textAlign: 'center',
    fontWeight: '900',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  formCard: {
    padding: 22,
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
});
