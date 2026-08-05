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
});
