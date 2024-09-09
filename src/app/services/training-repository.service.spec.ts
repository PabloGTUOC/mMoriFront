import { TestBed } from '@angular/core/testing';

import { TrainingRepositoryService } from './training-repository.service';

describe('TrainingRepositoryService', () => {
  let service: TrainingRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrainingRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
