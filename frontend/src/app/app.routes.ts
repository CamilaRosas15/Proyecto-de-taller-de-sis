import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Recetas } from './pages/recetas/recetas';
import { Principal } from './pages/principal/principal';
import { AnalisisImagenComponent } from './pages/analisis-imagen/analisis-imagen';

export const routes: Routes = [
  { path: '', redirectTo: '/principal', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio }, 
  { path: 'recetas', component: Recetas }, 
  { path: 'principal', component: Principal },
  { path: 'analisis-imagen', component: AnalisisImagenComponent },
  { path: '**', redirectTo: '/principal' } 
];