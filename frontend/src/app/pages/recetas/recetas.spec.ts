import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Recetas } from './recetas';

describe('Recetas', () => {
  let component: Recetas;
  let fixture: ComponentFixture<Recetas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Recetas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Recetas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial recipes', () => {
    expect(component.recetas.length).toBeGreaterThan(0);
  });

  it('should filter recipes by category', () => {
    component.filtrarPorCategoria('postres');
    expect(component.categoriaFiltro).toBe('postres');
    
    const postres = component.recetasFiltradas;
    expect(postres.every(receta => receta.categoria === 'Postres')).toBeTrue();
  });

  it('should return all recipes when category is "todas"', () => {
    component.filtrarPorCategoria('todas');
    expect(component.recetasFiltradas.length).toBe(component.recetas.length);
  });
});