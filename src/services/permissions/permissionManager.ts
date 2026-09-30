import { PermissionsAndroid, Platform } from 'react-native';

export class PermissionManager {
  /**
   * Requests necessary location, notification, and sensor permissions
   */
  public static async requestTrackingPermissions(): Promise<{
    locationGranted: boolean;
    notificationGranted: boolean;
    activityRecognitionGranted: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { locationGranted: true, notificationGranted: true, activityRecognitionGranted: true };
    }

    try {
      // 1. Request Fine & Coarse Location
      const locationPermissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const locationResults = await PermissionsAndroid.requestMultiple(locationPermissions);
      const fineGranted =
        locationResults[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const coarseGranted =
        locationResults[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const locationGranted = fineGranted || coarseGranted;

      // 2. Request Notification Permission (Android 13+ / API 33+)
      let notificationGranted = true;
      if (Platform.Version >= 33) {
        const notifResult = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as any
        );
        notificationGranted = notifResult === PermissionsAndroid.RESULTS.GRANTED;
      }

      // 3. Request Activity Recognition (Android 10+ / API 29+) for Step Counting
      let activityRecognitionGranted = true;
      if (Platform.Version >= 29) {
        const actResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
        );
        activityRecognitionGranted = actResult === PermissionsAndroid.RESULTS.GRANTED;
      }

      return {
        locationGranted,
        notificationGranted,
        activityRecognitionGranted,
      };
    } catch (error) {
      console.error('[PermissionManager] Error requesting permissions:', error);
      return {
        locationGranted: false,
        notificationGranted: false,
        activityRecognitionGranted: false,
      };
    }
  }

  /**
   * Request background location permission (Android 10+)
   */
  public static async requestBackgroundLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 29) {
      return true;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location Access',
          message:
            'AK1965 Track needs background location to continue recording your workout when the screen is locked.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('[PermissionManager] Background location request error:', error);
      return false;
    }
  }
}
