import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StretchItemComponent } from './stretch-item.component';

describe('StretchItemComponent', () => {
  let component: StretchItemComponent;
  let fixture: ComponentFixture<StretchItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StretchItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StretchItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
