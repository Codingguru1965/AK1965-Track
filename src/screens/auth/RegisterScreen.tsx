import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { register, isOnline } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('28');
  const [weight, setWeight] = useState('72');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in username, email, and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      setErrorMessage('Please enter a realistic age (10-120).');
      return;
    }
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
      setErrorMessage('Please enter a realistic weight in kg (20-300).');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const result = await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: ageNum,
        weight: weightNum,
      });

      if (result.success) {
        Alert.alert(
          'Registration Successful 🎉',
          'Your account has been created! Please log in with your credentials to continue.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                navigation.navigate('Login', {
                  prefillEmail: email.trim().toLowerCase(),
                });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        setErrorMessage(result.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.cardSecondary }]}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
          <Text style={[typography.h1, { color: colors.text }]}>Create Account</Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
            {isOnline
              ? 'Join AK1965 Track with cloud synchronization'
              : 'Creating offline profile (will sync when internet is restored)'}
          </Text>
        </View>

        <Card style={styles.formCard}>
          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(255, 82, 82, 0.12)' }]}>
              <Text style={[typography.bodySmall, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Text style={[typography.bodySmall, styles.label, { color: colors.textSecondary }]}>
            Username
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.cardSecondary, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="e.g. ankit_runner"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={[typography.bodySmall, styles.label, { color: colors.textSecondary }]}>
            Email Address
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.cardSecondary, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="e.g. ankit@ak1965track.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[typography.bodySmall, styles.label, { color: colors.textSecondary }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.cardSecondary, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Minimum 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.bodySmall, styles.label, { color: colors.textSecondary }]}>
                Age (years)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.cardSecondary, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="28"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[typography.bodySmall, styles.label, { color: colors.textSecondary }]}>
                Weight (kg)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.cardSecondary, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="72"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          </View>

          <Text style={[typography.bodySmall, { color: colors.textMuted, fontSize: 11, marginBottom: 14 }]}>
            * Weight and age are strictly used for MET calorie burn calculations.
          </Text>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
          />

          <View style={styles.loginPrompt}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>
                Sign In
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
  },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formCard: {
    padding: 22,
  },
  label: {
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
});
