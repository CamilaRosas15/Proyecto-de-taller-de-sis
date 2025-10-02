import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:4200', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  //console.log(`🚀 Servidor corriendo en: http://localhost:${port}/`);
  Logger.log(`🚀 Servidor corriendo en: http://localhost:${port}/api/`, 'Bootstrap');
}
bootstrap();
