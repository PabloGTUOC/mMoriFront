import { TestBed } from '@angular/core/testing';
import { UserDataService } from './user-data.service';
import { testingProviders } from '../../testing/testing-providers';

describe('UserDataService', () => {
  let service: UserDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(UserDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
