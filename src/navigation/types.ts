import { ActivityType } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Statistics: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ActivitySelect: undefined;
  LiveActivity: { activityType: ActivityType };
  ActivitySummary: { activityId: string };
  ActivityDetail: { activityId: string };
};
