import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingRepositoryComponent } from './training-repository.component';
import { testingProviders } from '../../testing/testing-providers';

describe('TrainingRepositoryComponent', () => {
  let component: TrainingRepositoryComponent;
  let fixture: ComponentFixture<TrainingRepositoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingRepositoryComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingRepositoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
