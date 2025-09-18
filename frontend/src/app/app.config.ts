import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; 
import { routes } from './app.routes';
import { importProvidersFrom } from '@angular/core'; // ✅ ¡Importa esto!
import { FormsModule } from '@angular/forms';           // ✅ ¡Importa esto!

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), 
    importProvidersFrom(FormsModule), // ✅ ¡Añade este proveedor para FormsModule!
  ]
  
};
