// platos-escaneados.module.ts
import { Module } from '@nestjs/common';
import { PlatosEscaneadosController } from './platos-escaneados.controller';
import { PlatosEscaneadosService } from './platos-escaneados.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PlatosEscaneadosController],
  providers: [PlatosEscaneadosService],
  exports: [PlatosEscaneadosService],
})
export class PlatosEscaneadosModule {}