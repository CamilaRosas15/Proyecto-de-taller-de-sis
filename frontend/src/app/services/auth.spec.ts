import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../app/services/auth'; // Cambia Auth por AuthService

describe('AuthService', () => { // Cambia el nombre del describe también
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService); // Cambia Auth por AuthService
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});