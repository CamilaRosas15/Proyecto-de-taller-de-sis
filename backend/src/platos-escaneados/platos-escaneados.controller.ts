// platos-escaneados.controller.ts
import { Controller, Get, Post, Delete, Body, Query, Param, Res, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlatosEscaneadosService } from './platos-escaneados.service';
import { Response } from 'express';

@Controller('platos-escaneados')
export class PlatosEscaneadosController {
  constructor(private readonly platosService: PlatosEscaneadosService) {}

  // Crear nuevo plato escaneado CON IMAGEN
  @Post()
  @UseInterceptors(FileInterceptor('imagen'))
  async crear(
    @UploadedFile() imagen: Express.Multer.File,
    @Body() datos: {
      analisis: string;
      id_usuario: string;
    },
    @Res() res: Response
  ) {
    if (!datos.id_usuario || !datos.analisis || !imagen) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'id_usuario, analisis e imagen son requeridos',
      });
    }

    try {
      const plato = await this.platosService.crearPlatoEscaneadoConImagen(datos, imagen);
      return res.status(HttpStatus.CREATED).json(plato);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: err.message || 'Error interno del servidor',
      });
    }
  }

  // Obtener historial para sidebar
  @Get('historial-sidebar')
  async obtenerHistorialSidebar(@Query('id_usuario') idUsuario: string, @Res() res: Response) {
    if (!idUsuario) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'El id_usuario es requerido',
      });
    }

    try {
      const historial = await this.platosService.obtenerHistorialSidebar(idUsuario);
      return res.status(HttpStatus.OK).json(historial);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: err.message || 'Error interno del servidor',
      });
    }
  }

  // Listar platos escaneados de un usuario
  @Get()
  async listar(@Query('id_usuario') idUsuario: string, @Res() res: Response) {
    if (!idUsuario) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'El id_usuario es requerido',
      });
    }

    try {
      const platos = await this.platosService.listarPlatosEscaneados(idUsuario);
      return res.status(HttpStatus.OK).json(platos);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: err.message || 'Error interno del servidor',
      });
    }
  }

  // Obtener detalle de un plato por id_plato
  @Get(':id')
  async obtener(@Param('id') id: string, @Res() res: Response) {
    try {
      const plato = await this.platosService.obtenerDetallePlato(id);
      if (!plato) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Plato no encontrado',
        });
      }
      return res.status(HttpStatus.OK).json(plato);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: err.message || 'Error interno del servidor',
      });
    }
  }

  // Eliminar un plato
  @Delete(':id')
  async eliminar(@Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.platosService.eliminarPlato(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: err.message || 'Error interno del servidor',
      });
    }
  }
}