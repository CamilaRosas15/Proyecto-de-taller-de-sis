import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Recetas } from './pages/recetas/recetas';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio }, 
  { path: 'recetas', component: Recetas }, 
  { path: '**', redirectTo: '/inicio' } 
];