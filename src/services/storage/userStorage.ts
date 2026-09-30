import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../../types';

const STORAGE_KEYS = {
  CURRENT_USER: '@ak1965_current_user',
  OFFLINE_MODE: '@ak1965_offline_mode',
  LAST_LOGIN_EMAIL: '@ak1965_last_email',
};

export const userStorage = {
  /**
   * Persist active user profile locally for instant offline hydration
   */
  async saveUser(user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      if (user.email) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOGIN_EMAIL, user.email);
      }
    } catch (error) {
      console.error('[UserStorage] Error saving user:', error);
    }
  },

  /**
   * Load active user profile from local storage
   */
  async getUser(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('[UserStorage] Error loading user:', error);
      return null;
    }
  },

  /**
   * Set offline mode flag
   */
  async setOfflineMode(isOffline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, isOffline ? '1' : '0');
    } catch (error) {
      console.error('[UserStorage] Error setting offline flag:', error);
    }
  },

  /**
   * Get offline mode flag
   */
  async isOfflineMode(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
      return val === '1';
    } catch {
      return false;
    }
  },

  /**
   * Clear user session on logout
   */
  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_MODE);
    } catch (error) {
      console.error('[UserStorage] Error clearing user:', error);
    }
  },

  /**
   * Get last remembered email for convenient login
   */
  async getLastEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOGIN_EMAIL);
    } catch {
      return null;
    }
  },
};
