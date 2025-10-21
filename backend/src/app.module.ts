import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NutrichefAiService } from './nutrichef-ai/nutrichef-ai.service';
import { NutrichefAiController } from './nutrichef-ai/nutrichef-ai.controller';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { RecipesController } from './recipes/recipes.controller'; // <--- ¡Importaremos este controlador aquí!
import { AuthModule } from './auth/auth.module';
import { RecipesModule } from './recipes/recipes.module';
import { PlatosEscaneadosModule } from './platos-escaneados/platos-escaneados.module';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes'), false);
        }
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,      // ✅ Esto debe estar presente
      envFilePath: '.env', // ✅ Asegura que .env sea reconocido
    }),
    SupabaseModule,        // ✅ ¡Añade tu SupabaseModule aquí!
    AuthModule, 
    RecipesModule, PlatosEscaneadosModule,
  ],
  controllers: [
    AppController,
    NutrichefAiController, // Tu controlador de IA
    //RecipesController      // ✅ ¡Añade tu controlador de Recetas aquí!
  ],
  providers: [
    AppService,
    NutrichefAiService,    // Tu servicio de IA
    // SupabaseService NO se añade aquí, porque ya lo provee SupabaseModule
  ],
})
export class AppModule {}