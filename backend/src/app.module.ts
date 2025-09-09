import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NutrichefAiService } from './nutrichef-ai/nutrichef-ai.service';
import { NutrichefAiController } from './nutrichef-ai/nutrichef-ai.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ Esto debe estar presente
      envFilePath: '.env', // ✅ Agregar esta línea
    }),
  ],
  controllers: [AppController, NutrichefAiController],
  providers: [AppService, NutrichefAiService],
})
export class AppModule {}