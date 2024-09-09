import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingItemComponent } from './training-item.component';

describe('TrainingItemComponent', () => {
  let component: TrainingItemComponent;
  let fixture: ComponentFixture<TrainingItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrainingItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
