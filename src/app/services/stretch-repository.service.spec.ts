import { TestBed } from '@angular/core/testing';

import { StretchRepositoryService } from './stretch-repository.service';

describe('StretchRepositoryService', () => {
  let service: StretchRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StretchRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
