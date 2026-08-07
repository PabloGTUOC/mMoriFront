import { rawCollection } from '../db/mongo.js';
import { WeightUpdate } from '../models/weight-update.model.js';
import { logger } from '../lib/logger.js';

/**
 * Life-expectancy business logic — the port of Rails' `LifeMethodsService`
 * (BACKEND_SPEC §5). Stateless; every function is pure except the two that read Mongo.
 */

export interface LifeExpectancyInput {
  country: string;
  gender: string;
  height: number;
  weight: number;
  training_frequency: number;
  smoking_status?: boolean | null;
  drinking_status?: boolean | null;
}

/**
 * §5.1 — base life expectancy from the `life_expectancy` reference collection.
 *
 * Normalisation matches the original: `country.strip` and `gender.strip.capitalize`
 * (so "male" matches the stored "Male"). Returns **0** when nothing matches, which is the
 * documented behaviour — the caller cannot distinguish "unknown country" from a real zero.
 * If every lookup returns 0, the `life_expectancy` collection has not been seeded
 * (see §3.7 and `npm run seed:life-expectancy`).
 */
export async function fetchBaseLifeExpectancy(
  userData: Pick<LifeExpectancyInput, 'country' | 'gender'>
): Promise<number> {
  const countryCode = (userData.country ?? '').trim();
  const gender = capitalize((userData.gender ?? '').trim());

  if (!countryCode || !gender) {
    logger.warn('fetchBaseLifeExpectancy called without country or gender');
    return 0;
  }

  const record = await rawCollection('life_expectancy').findOne({
    Country_Code: countryCode,
    Gender: gender,
    Type: 'LifeExpectancy_Gen',
  });

  if (record) {
    const years = Number(record['Years']);
    return Number.isFinite(years) ? years : 0;
  }

  /**
   * The reference dataset only carries Male and Female rows, so a user who selects "other"
   * at signup — an option the form offers — used to fall through to a base of 0 and a
   * meaningless "weeks left" figure, with no error anywhere
   * (FRONTEND_IMPROVEMENT_PLAN.md 6.7). Blend the two rows for their country instead.
   */
  const blended = await blendedLifeExpectancy(countryCode);
  if (blended !== null) {
    logger.debug(`No ${gender} row for ${countryCode}; using the blended figure`);
    return blended;
  }

  logger.debug(`No life_expectancy row for ${countryCode}/${gender}`);
  return 0;
}

/** §5.2 — most recent weigh-in, or null. `_id` breaks same-date ties (latest insert wins). */
export async function fetchLatestWeight(userId: string): Promise<number | null> {
  const latest = await WeightUpdate.findOne({ user_id: userId })
    .sort({ date: -1, _id: -1 })
    .lean();
  return latest?.weight ?? null;
}

/** §5.3 — BMI from centimetres and kilograms. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightInMeters = heightCm / 100;
  return weightKg / (heightInMeters * heightInMeters);
}

/** §5.4 — birthday-aware age in whole years. */
export function calculateAge(dob: Date, today: Date = new Date()): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * §5.5 — BMI adjustment.
 *
 * DELIBERATE DEVIATION FROM THE ORIGINAL (the spec asks for this decision to be recorded).
 * Rails used inclusive float ranges — `19..24.99`, `25..27.49`, `27.5..29.99`, `30..34.99`,
 * `35..39.99`, `40..` — which leave gaps. A BMI of 24.995 matched no `when` clause and fell
 * through to the `else`, collecting the **underweight** penalty of -2 instead of 0. Same for
 * 27.495, 29.995, 34.995 and 39.995.
 *
 * This implementation uses half-open ranges and handles BMI < 19 explicitly, exactly as
 * §5.5 recommends. Every band's intended penalty is unchanged; only the gap values differ,
 * and only in the direction of being correct.
 */
export function bmiAdjustment(bmi: number): number {
  if (bmi < 19) return -2;
  if (bmi < 25) return 0;
  if (bmi < 27.5) return -1.5;
  if (bmi < 30) return -3;
  if (bmi < 35) return -6;
  if (bmi < 40) return -6;
  return -10;
}

/**
 * §5.5 — training-frequency adjustment, in sessions per week.
 * Values outside 0..7 (negative, or above 7) get no adjustment — the original `case` had
 * no `else` branch, and that is preserved.
 */
export function trainingFrequencyAdjustment(frequency: number): number {
  if (frequency === 0) return -4;
  if (frequency >= 1 && frequency <= 2) return 4;
  if (frequency >= 3 && frequency <= 4) return 6;
  if (frequency >= 5 && frequency <= 6) return 8;
  if (frequency === 7) return 10;
  return 0;
}

/**
 * §5.5 — the core algorithm. Starts from `base` and applies lifestyle, BMI and training
 * adjustments. The weight used is the latest weigh-in, falling back to the profile weight.
 *
 * There is **no clamping**, per the spec: a smoker/drinker with a bad BMI and an unmatched
 * country (base 0) can produce a negative result, which in turn yields a negative
 * `weeks_left_to_live` downstream. Preserved so the number stays comparable with the
 * Rails backend's output for the same input.
 */
export function adjustLifeExpectancy(
  base: number,
  userData: LifeExpectancyInput,
  latestWeight: number | null = null
): number {
  return explainLifeExpectancy(base, userData, latestWeight).adjusted;
}

/** One named term in the adjustment, in years. */
export interface AdjustmentStep {
  key: 'smoking' | 'drinking' | 'bmi' | 'training';
  years: number;
}

export interface LifeExpectancyExplanation {
  adjusted: number;
  steps: AdjustmentStep[];
}

/**
 * The same four adjustments, itemised.
 *
 * `adjustLifeExpectancy` delegates here rather than repeating the arithmetic, so the total
 * and its explanation cannot drift apart — a breakdown that disagrees with the number it
 * breaks down is worse than no breakdown.
 *
 * Every step is returned, including the zero-valued ones. The onboarding form uses this to
 * show *why* a figure moved, and "BMI: no change" is as informative as a penalty; dropping
 * it would leave the reader wondering whether it was considered at all.
 */
export function explainLifeExpectancy(
  base: number,
  userData: LifeExpectancyInput,
  latestWeight: number | null = null
): LifeExpectancyExplanation {
  const weightToUse = latestWeight ?? userData.weight;

  const steps: AdjustmentStep[] = [
    // Step 1 — lifestyle
    { key: 'smoking', years: userData.smoking_status ? -10 : 0 },
    { key: 'drinking', years: userData.drinking_status ? -4 : 0 },
    // Step 2 — BMI, using the most recent weight available
    { key: 'bmi', years: bmiAdjustment(calculateBmi(weightToUse, userData.height)) },
    // Step 3 — training frequency
    { key: 'training', years: trainingFrequencyAdjustment(userData.training_frequency) },
  ];

  return {
    adjusted: steps.reduce((total, step) => total + step.years, base),
    steps,
  };
}

/** §4.15 step 6 — the figure the recommendation prompt is built around. */
export function weeksLeftToLive(adjustedLifeExpectancy: number, age: number): number {
  return (adjustedLifeExpectancy - age) * 52;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Mean of the Male and Female figures for a country, or null if neither is present. */
async function blendedLifeExpectancy(countryCode: string): Promise<number | null> {
  const rows = await rawCollection('life_expectancy')
    .find({ Country_Code: countryCode, Type: 'LifeExpectancy_Gen' })
    .toArray();

  const years = rows
    .map((row) => Number(row['Years']))
    .filter((value) => Number.isFinite(value));

  if (years.length === 0) return null;
  return years.reduce((total, value) => total + value, 0) / years.length;
}
