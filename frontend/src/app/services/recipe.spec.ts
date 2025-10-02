import { TestBed } from '@angular/core/testing';
import { RecipeService } from './recipe';

describe('RecipeService', () => { // <-- CORREGIDO AQUÍ
  let service: RecipeService; // <-- CORREGIDO AQUÍ

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipeService); // <-- CORREGIDO AQUÍ
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});