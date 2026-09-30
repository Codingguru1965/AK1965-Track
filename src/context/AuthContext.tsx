import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { secureStorage } from '../services/storage/secureStorage';
import { userStorage } from '../services/storage/userStorage';
import { apiClient } from '../services/api/apiClient';
import { networkMonitor } from '../services/network/networkMonitor';
import { UserRepository } from '../database/repositories/UserRepository';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  age: number;
  weight: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOfflineMode: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  continueOffline: (offlineProfile?: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(networkMonitor.isConnected);

  // Subscribe to network connectivity changes
  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((connected) => {
      setIsOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  // Hydrate session from secure storage & local storage on app startup
  useEffect(() => {
    const hydrateSession = async () => {
      try {
        let storedUser = await userStorage.getUser();
        const storedTokens = await secureStorage.getTokens();
        const wasOffline = await userStorage.isOfflineMode();

        if (storedUser) {
          setUser(storedUser);
          setIsOfflineMode(wasOffline || !storedTokens?.accessToken);
          UserRepository.upsert(storedUser);

          // If online and we have access token, verify/refresh in background
          if (storedTokens?.accessToken && networkMonitor.isConnected) {
            apiClient
              .get('/auth/me')
              .then((res) => {
                if (res.data?.success && res.data.user) {
                  const updated: UserProfile = {
                    id: res.data.user.id,
                    username: res.data.user.username,
                    email: res.data.user.email,
                    age: res.data.user.age,
                    weight: res.data.user.weight,
                    isOffline: false,
                  };
                  setUser(updated);
                  userStorage.saveUser(updated);
                  UserRepository.upsert(updated);
                }
              })
              .catch((err) => {
                console.log('[Auth] Background session check note:', err.message);
                // Keep local user active! Offline resilience guaranteed.
              });
          }
        }
      } catch (error) {
        console.error('[AuthContext] Session hydration error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateSession();
  }, []);

  /**
   * User Login with online API & offline fallback
   */
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.toLowerCase().trim();

    try {
      // 1. Attempt API login
      const response = await apiClient.post('/auth/login', {
        email: trimmedEmail,
        password,
      });

      if (response.data?.success) {
        const { user: apiUser, accessToken, refreshToken } = response.data;
        const profile: UserProfile = {
          id: apiUser.id,
          username: apiUser.username,
          email: apiUser.email,
          age: apiUser.age,
          weight: apiUser.weight,
          isOffline: false,
        };

        // Save tokens to hardware Keystore
        await secureStorage.saveTokens({ accessToken, refreshToken });
        // Save user to AsyncStorage & SQLite
        await userStorage.saveUser(profile);
        await userStorage.setOfflineMode(false);
        UserRepository.upsert(profile);

        setUser(profile);
        setIsOfflineMode(false);
        return { success: true };
      }
      return {
        success: false,
        message: response.data?.message || 'Login failed. Please check your credentials.',
      };
    } catch (error: any) {
      console.warn('[AuthContext] Login API call failed:', error?.message);

      // 2. Offline fallback: Check if user exists locally (AsyncStorage or SQLite)
      let localUser = await userStorage.getUser();
      if (!localUser || localUser.email.toLowerCase() !== trimmedEmail) {
        localUser = UserRepository.getByEmail(trimmedEmail);
      }

      if (localUser && localUser.email.toLowerCase() === trimmedEmail) {
        // Allow offline access to previously logged-in user
        setUser(localUser);
        setIsOfflineMode(true);
        await userStorage.saveUser(localUser);
        await userStorage.setOfflineMode(true);
        UserRepository.upsert(localUser);
        return {
          success: true,
          message: 'Logged in using offline cached session.',
        };
      }

      const errorMessage =
        error.response?.data?.message ||
        (error.message?.includes('Network Error') || !isOnline
          ? 'Network unavailable. You can use "Continue Offline" below to track workouts offline.'
          : 'Invalid email or password.');

      return { success: false, message: errorMessage };
    }
  };

  /**
   * User Registration with online API & offline creation
   */
  const register = async (
    data: RegisterData
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post('/auth/register', {
        username: data.username.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
        age: Number(data.age),
        weight: Number(data.weight),
      });

      if (response.data?.success) {
        const { user: apiUser, accessToken, refreshToken } = response.data;
        const profile: UserProfile = {
          id: apiUser.id,
          username: apiUser.username,
          email: apiUser.email,
          age: apiUser.age,
          weight: apiUser.weight,
          isOffline: false,
        };

        await secureStorage.saveTokens({ accessToken, refreshToken });
        await userStorage.saveUser(profile);
        await userStorage.setOfflineMode(false);
        UserRepository.upsert(profile);

        setUser(profile);
        setIsOfflineMode(false);
        return { success: true };
      }

      return {
        success: false,
        message: response.data?.message || 'Registration failed.',
      };
    } catch (error: any) {
      console.warn('[AuthContext] Register API call failed:', error?.message);

      // If network is offline, allow creating an offline profile
      if (error.message?.includes('Network Error') || !isOnline) {
        const offlineProfile: UserProfile = {
          id: `offline_usr_${Date.now()}`,
          username: data.username.trim() || 'Athlete',
          email: data.email.toLowerCase().trim(),
          age: Number(data.age) || 25,
          weight: Number(data.weight) || 70,
          isOffline: true,
          syncStatus: 'pending',
        };

        await userStorage.saveUser(offlineProfile);
        await userStorage.setOfflineMode(true);
        UserRepository.upsert(offlineProfile);
        setUser(offlineProfile);
        setIsOfflineMode(true);
        return {
          success: true,
          message: 'Offline profile created. Your workouts will be saved locally.',
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  /**
   * Continue immediately in Offline Mode (for guests or fresh installs without internet)
   */
  const continueOffline = async (offlineProfile?: Partial<UserProfile>): Promise<void> => {
    const profile: UserProfile = {
      id: offlineProfile?.id || `offline_${Date.now()}`,
      username: offlineProfile?.username || 'Offline Athlete',
      email: offlineProfile?.email || 'offline@ak1965track.local',
      age: offlineProfile?.age || 28,
      weight: offlineProfile?.weight || 72,
      isOffline: true,
      syncStatus: 'pending',
    };

    await userStorage.saveUser(profile);
    await userStorage.setOfflineMode(true);
    UserRepository.upsert(profile);
    setUser(profile);
    setIsOfflineMode(true);
  };

  /**
   * User Logout
   */
  const logout = async (): Promise<void> => {
    try {
      if (!isOfflineMode && isOnline) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } finally {
      await secureStorage.clearTokens();
      await userStorage.clearUser();
      setUser(null);
      setIsOfflineMode(false);
    }
  };

  /**
   * Update Profile Locally and on Server
   */
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) return;
    const updatedUser: UserProfile = { ...user, ...updates };
    setUser(updatedUser);
    await userStorage.saveUser(updatedUser);
    UserRepository.upsert(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isOfflineMode,
    isOnline,
    login,
    register,
    continueOffline,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
