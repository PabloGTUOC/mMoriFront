import { describe, expect, it } from 'vitest';
import {
  adjustLifeExpectancy,
  bmiAdjustment,
  calculateAge,
  calculateBmi,
  trainingFrequencyAdjustment,
  weeksLeftToLive,
} from '../src/services/life-methods.service.js';

/**
 * Coverage for BACKEND_SPEC §5, following the test plan in §8. These are pure functions,
 * so no database is involved.
 */

describe('calculateBmi (§5.3)', () => {
  it('computes BMI from centimetres and kilograms', () => {
    // The spec's worked example: 95kg at 180cm.
    expect(calculateBmi(95, 180)).toBeCloseTo(29.32, 2);
  });
});

describe('calculateAge (§5.4)', () => {
  const dob = new Date(Date.UTC(1990, 4, 14)); // 1990-05-14

  it('counts a birthday that has already passed this year', () => {
    expect(calculateAge(dob, new Date(Date.UTC(2024, 7, 1)))).toBe(34);
  });

  it('does not count a birthday still ahead this year', () => {
    expect(calculateAge(dob, new Date(Date.UTC(2024, 2, 1)))).toBe(33);
  });

  it('counts the birthday itself', () => {
    expect(calculateAge(dob, new Date(Date.UTC(2024, 4, 14)))).toBe(34);
  });

  it('does not count the day before the birthday', () => {
    expect(calculateAge(dob, new Date(Date.UTC(2024, 4, 13)))).toBe(33);
  });

  it('handles a leap-day date of birth in a non-leap year', () => {
    const leapDob = new Date(Date.UTC(2000, 1, 29)); // 2000-02-29
    expect(calculateAge(leapDob, new Date(Date.UTC(2023, 1, 28)))).toBe(22);
    expect(calculateAge(leapDob, new Date(Date.UTC(2023, 2, 1)))).toBe(23);
  });
});

describe('bmiAdjustment (§5.5 step 2)', () => {
  it('applies the documented penalty for each band', () => {
    expect(bmiAdjustment(18.4)).toBe(-2); // underweight
    expect(bmiAdjustment(22)).toBe(0); // healthy
    expect(bmiAdjustment(26)).toBe(-1.5);
    expect(bmiAdjustment(28)).toBe(-3);
    expect(bmiAdjustment(32)).toBe(-6);
    expect(bmiAdjustment(37)).toBe(-6);
    expect(bmiAdjustment(45)).toBe(-10);
  });

  it('treats each band boundary as the start of the new band', () => {
    expect(bmiAdjustment(19)).toBe(0);
    expect(bmiAdjustment(25)).toBe(-1.5);
    expect(bmiAdjustment(27.5)).toBe(-3);
    expect(bmiAdjustment(30)).toBe(-6);
    expect(bmiAdjustment(40)).toBe(-10);
  });

  /**
   * Pins down the deliberate deviation documented in the service.
   *
   * Rails used inclusive ranges (19..24.99, 25..27.49, ...), so these values matched no
   * band and fell through to the `else`, collecting the underweight penalty of -2. Here
   * they land in the band a reader would expect. If wire-identical parity with the old
   * backend ever matters more than correctness, this is the test that has to change.
   */
  it('classifies the values that fell through the original range gaps', () => {
    expect(bmiAdjustment(24.995)).toBe(0); // was -2 in Rails
    expect(bmiAdjustment(27.495)).toBe(-1.5); // was -2
    expect(bmiAdjustment(29.995)).toBe(-3); // was -2
    expect(bmiAdjustment(34.995)).toBe(-6); // was -2
    expect(bmiAdjustment(39.995)).toBe(-6); // was -2
  });
});

describe('trainingFrequencyAdjustment (§5.5 step 3)', () => {
  it('rewards each documented band', () => {
    expect(trainingFrequencyAdjustment(0)).toBe(-4);
    expect(trainingFrequencyAdjustment(1)).toBe(4);
    expect(trainingFrequencyAdjustment(2)).toBe(4);
    expect(trainingFrequencyAdjustment(3)).toBe(6);
    expect(trainingFrequencyAdjustment(4)).toBe(6);
    expect(trainingFrequencyAdjustment(5)).toBe(8);
    expect(trainingFrequencyAdjustment(6)).toBe(8);
    expect(trainingFrequencyAdjustment(7)).toBe(10);
  });

  it('ignores out-of-range values, as the original had no else branch', () => {
    expect(trainingFrequencyAdjustment(8)).toBe(0);
    expect(trainingFrequencyAdjustment(-1)).toBe(0);
  });
});

describe('adjustLifeExpectancy (§5.5)', () => {
  const profile = {
    country: 'ESP',
    gender: 'Male',
    height: 180,
    weight: 78,
    training_frequency: 4,
    smoking_status: false,
    drinking_status: false,
  };

  it('reproduces the spec worked example', () => {
    // Male, ESP, base 83.2, 180cm, latest weight 95kg, drinker, trains 4x/week.
    // BMI 29.32 → -3, drinking → -4, training 4 → +6. Expected: 82.2.
    const result = adjustLifeExpectancy(83.2, { ...profile, drinking_status: true }, 95);
    expect(result).toBeCloseTo(82.2, 10);
  });

  it('applies both lifestyle penalties', () => {
    const base = 80;
    const healthy = adjustLifeExpectancy(base, profile, 78); // BMI 24.07 → 0, training +6
    expect(healthy).toBe(86);

    const smoker = adjustLifeExpectancy(base, { ...profile, smoking_status: true }, 78);
    expect(smoker).toBe(76); // -10

    const both = adjustLifeExpectancy(
      base,
      { ...profile, smoking_status: true, drinking_status: true },
      78
    );
    expect(both).toBe(72); // -10 -4
  });

  it('prefers the latest weigh-in over the profile weight', () => {
    const withProfileWeight = adjustLifeExpectancy(80, profile, null); // 78kg → BMI 24.07 → 0
    const withLatestWeight = adjustLifeExpectancy(80, profile, 110); // BMI 33.95 → -6
    expect(withProfileWeight).toBe(86);
    expect(withLatestWeight).toBe(80);
  });

  it('does not clamp, so a bad profile with no base can go negative', () => {
    // Unseeded life_expectancy collection → base 0 (§5.1).
    const result = adjustLifeExpectancy(
      0,
      { ...profile, smoking_status: true, drinking_status: true, training_frequency: 0 },
      78
    );
    expect(result).toBe(-18);
    expect(weeksLeftToLive(result, 30)).toBeLessThan(0);
  });
});

describe('weeksLeftToLive (§4.15 step 6)', () => {
  it('converts remaining years into weeks', () => {
    expect(weeksLeftToLive(82, 30)).toBe(2704);
  });
});
