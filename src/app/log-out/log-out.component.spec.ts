import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogOutComponent } from './log-out.component';
import { testingProviders } from '../../testing/testing-providers';

describe('LogOutComponent', () => {
  let component: LogOutComponent;
  let fixture: ComponentFixture<LogOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogOutComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(LogOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
