import { Injectable } from '@angular/core';

/**
 * The health figures the dashboard shows.
 *
 * These lived as methods on `DisplayDailyComponent`, which meant the app's only real
 * business logic was untestable without instantiating a component, and invisible to any
 * other view that might need it (FRONTEND_IMPROVEMENT_PLAN.md 5.4).
 *
 * They are also **deliberately duplicated** from the backend's `life-methods.service.ts`:
 * the server computes adjusted life expectancy, the client derives age, BMI and weeks from
 * it. Keeping the client copy in one tested place is what makes the two comparable — see
 * BACKEND_SPEC §5 for the authoritative definitions.
 */
@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  /** Whole years, accounting for whether this year's birthday has happened yet. */
  calculateAge(dob: Date, today: Date = new Date()): number {
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /** Kilograms and centimetres, rounded to two decimals. */
  calculateBMI(weight: number, heightCm: number): number {
    const heightInMeters = heightCm / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(2));
  }

  determineBMIStatus(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal Weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  /** Guards the first day, when no days have elapsed yet. */
  calculatePercentage(trainedDays: number, totalDays: number): number {
    return totalDays > 0 ? parseFloat(((trainedDays / totalDays) * 100).toFixed(2)) : 0;
  }

  /** Clamped at zero: past your estimate, "negative weeks left" is not a useful figure. */
  calculateWeeksLeftToLive(adjustedLifeExpectancy: number, currentAge: number): number {
    const yearsLeft = adjustedLifeExpectancy - currentAge;
    return yearsLeft > 0 ? Math.round(yearsLeft * 52) : 0;
  }

  calculateWeeksGone(currentAge: number): number {
    return currentAge > 0 ? Math.round(currentAge * 52) : 0;
  }
}
