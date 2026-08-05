import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LifeExpectancyChartComponent } from './life-expectancy-chart.component';
import { testingProviders } from '../../testing/testing-providers';

describe('LifeExpectancyChartComponent', () => {
  let component: LifeExpectancyChartComponent;
  let fixture: ComponentFixture<LifeExpectancyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifeExpectancyChartComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(LifeExpectancyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
