import { TestBed } from '@angular/core/testing';
import { ThoughtsService } from './thoughts.service';
import { testingProviders } from '../../testing/testing-providers';

describe('ThoughtsService', () => {
  let service: ThoughtsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(ThoughtsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
