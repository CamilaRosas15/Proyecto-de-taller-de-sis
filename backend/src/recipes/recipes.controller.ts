import { Controller, Get, Param, Post, Body, NotFoundException, Logger } from '@nestjs/common';
import { RecipesService } from './recipes.service';

class RecommendRequestDto {
  userId?: string;
  alergias?: string[] = [];
  no_me_gusta?: string[] = [];
  gustos?: string[] = [];
  kcal_diarias?: number;
  tiempo_max?: number;
}

@Controller('recipes') 
export class RecipesController {
  private readonly logger = new Logger(RecipesController.name);

  constructor(private readonly recipesService: RecipesService) {
    this.logger.log('✅ RecipesController inicializado');
  }

  // NUEVO ENDPOINT: Obtener todas las recetas
  @Get()
  async getAll() {
    this.logger.log('📋 GET /recipes llamado');
    try {
      const result = await this.recipesService.getAll();
      this.logger.log(`✅ Retornando ${result?.length} recetas`);
      return result;
    } catch (error) {
      this.logger.error('❌ Error en GET /recipes:', error);
      throw error;
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    this.logger.log(`🔍 GET /recipes/${id} llamado`);
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new NotFoundException('El ID de receta debe ser numérico.');
    const receta = await this.recipesService.getById(numId);
    if (!receta) throw new NotFoundException(`No se encontró la receta con ID ${numId}.`);
    return receta;
  }

  @Post('recomendaciones')
  async recomendar(@Body() body: RecommendRequestDto) {
    this.logger.log('🤖 POST /recipes/recomendaciones llamado');
    return this.recipesService.recomendarReceta(body);
  }
}