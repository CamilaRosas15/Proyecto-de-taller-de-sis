import { Module } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtAuthGuard } from './jwt-auth.guard'; // AÑADIR

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard, // AÑADIR
  ],
  exports: [JwtAuthGuard], // AÑADIR
})
export class AuthModule {}