import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisplayDailyComponent } from './display-daily.component';
import { testingProviders } from '../../testing/testing-providers';

describe('DisplayDailyComponent', () => {
  let component: DisplayDailyComponent;
  let fixture: ComponentFixture<DisplayDailyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayDailyComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayDailyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
      expect(component.calculateAge(dob)).toBe(30);
    });

    it('does not count a birthday still ahead this year', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 30, 11, 31);
      const expected = today.getMonth() === 11 && today.getDate() === 31 ? 30 : 29;
      expect(component.calculateAge(dob)).toBe(expected);
    });
  });

  describe('calculateBMI', () => {
    it('computes BMI from kilograms and centimetres', () => {
      expect(component.calculateBMI(78, 180)).toBe(24.07);
    });

    it('rounds to two decimals', () => {
      expect(component.calculateBMI(95, 180)).toBe(29.32);
    });
  });

  describe('determineBMIStatus', () => {
    it('labels each band', () => {
      expect(component.determineBMIStatus(17)).toBe('Underweight');
      expect(component.determineBMIStatus(22)).toBe('Normal Weight');
      expect(component.determineBMIStatus(27)).toBe('Overweight');
      expect(component.determineBMIStatus(35)).toBe('Obese');
    });

    it('treats the boundary values as the start of their band', () => {
      expect(component.determineBMIStatus(18.5)).toBe('Normal Weight');
      expect(component.determineBMIStatus(25)).toBe('Overweight');
      expect(component.determineBMIStatus(30)).toBe('Obese');
    });
  });

  describe('calculatePercentage', () => {
    it('reports the share of days trained', () => {
      expect(component.calculatePercentage(42, 130)).toBe(32.31);
    });

    it('returns 0 rather than dividing by zero on the first day', () => {
      expect(component.calculatePercentage(0, 0)).toBe(0);
    });
  });

  describe('week conversions', () => {
    it('converts remaining years into weeks', () => {
      expect(component.calculateWeeksLeftToLive(82, 30)).toBe(2704);
    });

    it('never reports negative weeks remaining', () => {
      expect(component.calculateWeeksLeftToLive(30, 82)).toBe(0);
    });

    it('converts age into weeks already lived', () => {
      expect(component.calculateWeeksGone(30)).toBe(1560);
    });
  });

  it('toggles the life expectancy chart', () => {
    expect(component.isChartVisible).toBe(false);
    component.toggleLifeExpectancyChart();
    expect(component.isChartVisible).toBe(true);
    component.toggleLifeExpectancyChart();
    expect(component.isChartVisible).toBe(false);
  });
});
