import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirstTimeComponent } from './first-time.component';
import { testingProviders } from '../../testing/testing-providers';

describe('FirstTimeComponent', () => {
  let component: FirstTimeComponent;
  let fixture: ComponentFixture<FirstTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstTimeComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(FirstTimeComponent);
    component = fixture.componentInstance;
    component.initializeForm();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
