import { TestBed } from '@angular/core/testing';
import { StretchRepositoryService } from './stretch-repository.service';
import { testingProviders } from '../../testing/testing-providers';

describe('StretchRepositoryService', () => {
  let service: StretchRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(StretchRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
