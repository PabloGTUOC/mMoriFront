import { TestBed } from '@angular/core/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * These are the numbers the dashboard actually shows. They are also duplicated in the
   * backend's life-methods service — plan item 5.4 moves them somewhere shared, and these
   * assertions are what will make that move safe.
   */
  describe('calculateAge', () => {
    it('counts a birthday that has already passed this year', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 30, 0, 1);
      expect(service.calculateAge(dob)).toBe(30);
    });

    it('does not count a birthday still ahead this year', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 30, 11, 31);
      const expected = today.getMonth() === 11 && today.getDate() === 31 ? 30 : 29;
      expect(service.calculateAge(dob)).toBe(expected);
    });
  });

  describe('calculateBMI', () => {
    it('computes BMI from kilograms and centimetres', () => {
      expect(service.calculateBMI(78, 180)).toBe(24.07);
    });

    it('rounds to two decimals', () => {
      expect(service.calculateBMI(95, 180)).toBe(29.32);
    });
  });

  describe('determineBMIStatus', () => {
    it('labels each band', () => {
      expect(service.determineBMIStatus(17)).toBe('Underweight');
      expect(service.determineBMIStatus(22)).toBe('Normal Weight');
      expect(service.determineBMIStatus(27)).toBe('Overweight');
      expect(service.determineBMIStatus(35)).toBe('Obese');
    });

    it('treats the boundary values as the start of their band', () => {
      expect(service.determineBMIStatus(18.5)).toBe('Normal Weight');
      expect(service.determineBMIStatus(25)).toBe('Overweight');
      expect(service.determineBMIStatus(30)).toBe('Obese');
    });
  });

  describe('calculatePercentage', () => {
    it('reports the share of days trained', () => {
      expect(service.calculatePercentage(42, 130)).toBe(32.31);
    });

    it('returns 0 rather than dividing by zero on the first day', () => {
      expect(service.calculatePercentage(0, 0)).toBe(0);
    });
  });

  describe('week conversions', () => {
    it('converts remaining years into weeks', () => {
      expect(service.calculateWeeksLeftToLive(82, 30)).toBe(2704);
    });

    it('never reports negative weeks remaining', () => {
      expect(service.calculateWeeksLeftToLive(30, 82)).toBe(0);
    });

    it('converts age into weeks already lived', () => {
      expect(service.calculateWeeksGone(30)).toBe(1560);
    });
  });
});
