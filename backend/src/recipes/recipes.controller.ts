import { Controller, Get, Param, Post, Body, NotFoundException, Logger, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // AÑADIR

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

  // AÑADIR ESTOS NUEVOS ENDPOINTS:
  @Post('history/:userId')
  @UseGuards(JwtAuthGuard)
  async saveToHistory(
    @Param('userId') userId: string,
    @Body('id_receta') idReceta: number
  ) {
    this.logger.log(`💾 Guardando receta ${idReceta} en historial para usuario ${userId}`);
    return this.recipesService.saveToHistory(userId, idReceta);
  }

  @Get('history/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserHistory(@Param('userId') userId: string) {
    this.logger.log(`📚 Obteniendo historial para usuario ${userId}`);
    return this.recipesService.getUserHistoryWithDetails(userId);
  }
}