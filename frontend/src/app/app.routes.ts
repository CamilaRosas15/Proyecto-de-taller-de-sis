import { Routes } from '@angular/router';
//import { Inicio } from './pages/inicio/inicio';
import { Recetas } from './pages/recetas/recetas';
import { Principal } from './pages/principal/principal';
import { AnalisisImagenComponent } from './pages/analisis-imagen/analisis-imagen';
import { Registro } from './pages/registro/registro';
import { Login } from './pages/login/login';
import { SobreNosotros } from './pages/sobre-nosotros/sobre-nosotros';
import { ChatIAComponent } from './pages/chat-ia/chat-ia'; // ← Agregar esta importación

export const routes: Routes = [
  { path: '', redirectTo: '/principal', pathMatch: 'full' }, 
  //{ path: 'inicio', component: Inicio }, 
  { path: 'recetas', component: Recetas }, 
  { path: 'principal', component: Principal },
  { path: 'analisis-imagen', component: AnalisisImagenComponent },
  { path: 'registro', component: Registro },
  { path: 'login', component: Login },
  { path: 'sobre-nosotros', component: SobreNosotros }, 
  { path: 'chat-ia', component: ChatIAComponent }, // ← Agregar esta nueva ruta
  { path: '**', redirectTo: '/principal' } 
];