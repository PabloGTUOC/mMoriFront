import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThoughtsComponent } from './thoughts.component';
import { testingProviders } from '../../testing/testing-providers';

describe('ThoughtsComponent', () => {
  let component: ThoughtsComponent;
  let fixture: ComponentFixture<ThoughtsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThoughtsComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(ThoughtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
