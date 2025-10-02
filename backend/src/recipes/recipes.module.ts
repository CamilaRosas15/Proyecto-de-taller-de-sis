import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { SupabaseModule } from 'src/supabase/supabase.module'; 

@Module({
  imports: [SupabaseModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
