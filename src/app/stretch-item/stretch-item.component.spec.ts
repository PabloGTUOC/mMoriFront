import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StretchItemComponent } from './stretch-item.component';
import { testingProviders } from '../../testing/testing-providers';

describe('StretchItemComponent', () => {
  let component: StretchItemComponent;
  let fixture: ComponentFixture<StretchItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StretchItemComponent],
      providers: testingProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(StretchItemComponent);
    component = fixture.componentInstance;
    component.stretch = { name: 'Hamstring', description: 'Hold', video_link: 'https://www.youtube.com/watch?v=abc' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
