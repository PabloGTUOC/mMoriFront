import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayDailyComponent } from './display-daily.component';

describe('DisplayDailyComponent', () => {
  let component: DisplayDailyComponent;
  let fixture: ComponentFixture<DisplayDailyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayDailyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayDailyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
