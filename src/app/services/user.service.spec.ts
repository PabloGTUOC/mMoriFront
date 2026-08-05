import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { testingProviders } from '../../testing/testing-providers';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
