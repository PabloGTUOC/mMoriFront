import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { testingProviders } from '../../testing/testing-providers';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testingProviders() });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
