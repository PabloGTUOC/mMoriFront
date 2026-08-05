import { TestBed } from '@angular/core/testing';
import { TrainingRepositoryService } from './training-repository.service';
import { testingProviders } from '../../testing/testing-providers';

describe('TrainingRepositoryService', () => {
  let service: TrainingRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(TrainingRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
