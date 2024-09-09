import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LifeExpectancyChartComponent } from './life-expectancy-chart.component';

describe('LifeExpectancyChartComponent', () => {
  let component: LifeExpectancyChartComponent;
  let fixture: ComponentFixture<LifeExpectancyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LifeExpectancyChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LifeExpectancyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
