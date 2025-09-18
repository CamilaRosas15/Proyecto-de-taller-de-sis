import { Controller,  Get, Param, ParseIntPipe, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase/supabase.service';

@Controller('recipes') // Este controlador responderá a /api/recipes (si tienes GlobalPrefix('api'))
export class RecipesController {
  private readonly logger = new Logger(RecipesController.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  
  @Get(':id') // Endpoint para GET /api/recipes/:id
  async getRecipeById(@Param('id', ParseIntPipe) id: number): Promise<any> {
    this.logger.log(`Received request for recipe ID: ${id}`);
    const recipe = await this.supabaseService.getRecetaById(id);
    if (!recipe) {
      this.logger.warn(`Recipe with ID ${id} not found.`);
      throw new NotFoundException(`Recipe with ID ${id} not found in Supabase.`);
    }
    this.logger.log(`Successfully fetched recipe ID: ${id}`);
    return recipe;
  }
  // Puedes añadir más endpoints aquí según necesites, ej. para buscar por categoría, obtener todas, etc.
}