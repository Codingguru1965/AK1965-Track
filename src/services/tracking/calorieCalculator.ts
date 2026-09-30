import { ActivityType } from '../../types';

export class CalorieCalculator {
  // Metabolic Equivalent of Task (MET) reference values
  private static readonly MET_VALUES: Record<ActivityType, number> = {
    running: 9.8,  // Moderate running ~6 mph (10 min/mile)
    walking: 3.8,  // Brisk walking ~3.5 mph
    cycling: 7.5,  // Moderate cycling 12-14 mph
  };

  /**
   * Calculates estimated calorie expenditure in kcal based on MET, body weight, and duration
   * 
   * Formula: Calories = MET * weight_kg * (duration_seconds / 3600)
   */
  public static calculate(
    activityType: ActivityType,
    weightKg: number,
    durationSeconds: number
  ): number {
    if (weightKg <= 0 || durationSeconds <= 0) return 0;

    const met = this.MET_VALUES[activityType] || 7.0;
    const hours = durationSeconds / 3600;
    const calories = met * weightKg * hours;

    return Math.round(calories);
  }
}
