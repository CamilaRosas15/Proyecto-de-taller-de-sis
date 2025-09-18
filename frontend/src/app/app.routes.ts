import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Principal } from './pages/principal/principal';

export const routes: Routes = [
  /*{ path: '', redirectTo: '/inicio', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio }, 
  { path: '**', redirectTo: '/inicio' } */
  { path: 'principal', component: Principal },
];






