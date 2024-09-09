import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StretchRepositoryComponent } from './stretch-repository.component';

describe('StretchRepositoryComponent', () => {
  let component: StretchRepositoryComponent;
  let fixture: ComponentFixture<StretchRepositoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StretchRepositoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StretchRepositoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
