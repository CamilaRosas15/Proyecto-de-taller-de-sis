import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Recetas } from './pages/recetas/recetas';
import { Principal } from './pages/principal/principal';
import { Registro } from './pages/registro/registro';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', redirectTo: '/principal', pathMatch: 'full' }, 
  { path: 'inicio', component: Inicio }, 
  { path: 'recetas', component: Recetas }, 
  { path: 'principal', component: Principal },
  {path: 'registro', component: Registro },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '/principal' } 
];