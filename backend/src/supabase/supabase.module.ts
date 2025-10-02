
import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';
import { ConfigModule } from '@nestjs/config'; // Importar ConfigModule para ConfigService

@Module({
  imports: [ConfigModule], // Asegurarse de importar ConfigModule
  providers: [SupabaseService],
  exports: [SupabaseService], // Exportar el servicio para que sea inyectable en otros módulos
})
export class SupabaseModule {}