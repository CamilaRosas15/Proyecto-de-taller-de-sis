import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NutrichefAiService } from './nutrichef-ai/nutrichef-ai.service';
import { NutrichefAiController } from './nutrichef-ai/nutrichef-ai.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true, // 👈 hace que ConfigService esté disponible en toda la app
    })],
  controllers: [AppController, NutrichefAiController],
  providers: [AppService, NutrichefAiService],
})
export class AppModule {}
