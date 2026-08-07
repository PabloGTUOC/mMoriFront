import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { FirstTimeComponent } from './first-time.component';
import { testingProviders } from '../../testing/testing-providers';
import { environment } from '../../environments/environment';
import { AdjustmentStep } from '../models';

describe('FirstTimeComponent', () => {
  let component: FirstTimeComponent;
  let fixture: ComponentFixture<FirstTimeComponent>;
  let httpMock: HttpTestingController;

  const previewUrl = `${environment.apiUrl}/user_data/preview`;

  const completeForm = {
    dob: '1990-05-10',
    gender: 'male',
    height: 178,
    weight: 75,
    trainingFrequency: 3,
    smoker: false,
    drinker: true,
    country_code: 'ESP',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstTimeComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(FirstTimeComponent);
    component = fixture.componentInstance;
    component.initializeForm();
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows no preview before anything is filled in', () => {
    expect(component.preview()).toBeNull();
  });

  describe('the live preview', () => {
    /**
     * The mapping is the historically bug-prone part: the form's control names are its own
     * (`trainingFrequency`, `smoker`, `drinker`, `country_code`) and the API's are not.
     * Sending the form value verbatim is what used to drop four fields on submit.
     */
    it('sends the backend field names, not the form control names', fakeAsync(() => {
      component.userForm.patchValue(completeForm);
      tick(400);

      const request = httpMock.expectOne(previewUrl);
      expect(request.request.body.user_data).toEqual({
        dob: '1990-05-10',
        gender: 'male',
        height: 178,
        weight: 75,
        training_frequency: 3,
        smoking_status: false,
        drinking_status: true,
        country: 'ESP',
      });
      request.flush({ success: false });
      tick();
    }));

    it('waits for typing to settle rather than calling on every keystroke', fakeAsync(() => {
      component.userForm.patchValue({ ...completeForm, weight: 70 });
      tick(100);
      component.userForm.patchValue({ ...completeForm, weight: 75 });
      tick(100);
      component.userForm.patchValue({ ...completeForm, weight: 78 });

      // Nothing sent while the value is still moving.
      httpMock.expectNone(previewUrl);

      tick(400);
      const request = httpMock.expectOne(previewUrl);
      expect(request.request.body.user_data.weight).toBe(78);
      request.flush({ success: false });
      tick();
    }));

    it('does not ask until there is enough to compute with', fakeAsync(() => {
      component.userForm.patchValue({ gender: 'male', height: 178 });
      tick(400);

      httpMock.expectNone(previewUrl);
      expect(component.preview()).toBeNull();
    }));

    it('keeps the form usable when the preview fails', fakeAsync(() => {
      component.userForm.patchValue(completeForm);
      tick(400);

      httpMock
        .expectOne(previewUrl)
        .flush({ success: false }, { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.preview()).toBeNull();
      expect(component.userForm.valid).toBe(true);
    }));
  });

  describe('explaining the adjustment', () => {
    const step = (key: AdjustmentStep['key'], years: number): AdjustmentStep => ({ key, years });

    it('labels every key the backend can return', () => {
      const keys: AdjustmentStep['key'][] = ['smoking', 'drinking', 'bmi', 'training'];
      for (const key of keys) {
        expect(component.stepLabel(step(key, 0))).toBeTruthy();
      }
    });

    /** The sign is the meaning, so it is never dropped. */
    it('keeps the sign on the figure', () => {
      expect(component.stepValue(step('training', 6))).toBe('+6 years');
      expect(component.stepValue(step('smoking', -10))).toBe('-10 years');
    });

    it('says so plainly when a term changed nothing', () => {
      expect(component.stepValue(step('bmi', 0))).toBe('no change');
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
