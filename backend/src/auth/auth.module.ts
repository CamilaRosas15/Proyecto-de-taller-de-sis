// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module'; 
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [SupabaseModule, ConfigModule], 
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}