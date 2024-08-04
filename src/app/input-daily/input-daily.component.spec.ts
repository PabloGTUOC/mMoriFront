import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputDailyComponent } from './input-daily.component';

describe('InputDailyComponent', () => {
  let component: InputDailyComponent;
  let fixture: ComponentFixture<InputDailyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InputDailyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputDailyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
