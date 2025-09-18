import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Recetas } from './pages/recetas/recetas';
import { Principal } from './pages/principal/principal';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio }, 
  { path: 'recetas', component: Recetas }, 
  { path: 'principal', component: Principal },
  { path: '**', redirectTo: '/inicio' } 
];