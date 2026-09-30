import * as Keychain from 'react-native-keychain';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const KEYCHAIN_SERVICE = 'com.ak1965track.auth_tokens';

/**
 * Hardware-backed secure storage using Android Keystore via react-native-keychain
 */
export const secureStorage = {
  /**
   * Save access and refresh tokens securely in Android Keystore
   */
  async saveTokens(tokens: AuthTokens): Promise<boolean> {
    try {
      const payload = JSON.stringify(tokens);
      await Keychain.setGenericPassword('auth_session', payload, {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
      });
      return true;
    } catch (error) {
      console.error('[SecureStorage] Error saving tokens:', error);
      return false;
    }
  },

  /**
   * Retrieve access and refresh tokens from Android Keystore
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      if (credentials && credentials.password) {
        const tokens: AuthTokens = JSON.parse(credentials.password);
        return tokens;
      }
      return null;
    } catch (error) {
      console.error('[SecureStorage] Error retrieving tokens:', error);
      return null;
    }
  },

  /**
   * Delete tokens from Android Keystore (e.g. on logout)
   */
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({
        service: KEYCHAIN_SERVICE,
      });
      return true;
    } catch (error) {
      console.error('[SecureStorage] Error clearing tokens:', error);
      return false;
    }
  },
};
