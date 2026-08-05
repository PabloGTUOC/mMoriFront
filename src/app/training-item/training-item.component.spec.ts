import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingItemComponent } from './training-item.component';
import { testingProviders } from '../../testing/testing-providers';

describe('TrainingItemComponent', () => {
  let component: TrainingItemComponent;
  let fixture: ComponentFixture<TrainingItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingItemComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingItemComponent);
    component = fixture.componentInstance;
    component.training = { name: 'HIIT', type: 'Cardio', duration: 30, calories: 350, description: 'Test' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
