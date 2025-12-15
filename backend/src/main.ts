import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true, // 👈 permite frontend en la nube (Render / Vercel)
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Servidor corriendo en puerto ${port} (/api)`,
    'Bootstrap',
  );
  //const app = await NestFactory.create(AppModule);
}
bootstrap();
