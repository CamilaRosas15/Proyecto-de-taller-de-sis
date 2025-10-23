// platos-escaneados.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlatosEscaneadosService {
  private readonly logger = new Logger(PlatosEscaneadosService.name);
  private readonly bucketName = 'historial_imagenes';

  constructor(private readonly supabaseService: SupabaseService) {}

  // Método para subir imagen a Supabase Storage
  async subirImagen(imagenBuffer: Buffer, nombreArchivo: string, userId: string): Promise<string> {
    try {
      const extension = nombreArchivo.split('.').pop() || 'jpg';
      const nombreUnico = `${uuidv4()}.${extension}`;
      const rutaArchivo = `users/${userId}/${nombreUnico}`;
      
      const { data, error } = await this.supabaseService
        .getClient()
        .storage
        .from(this.bucketName)
        .upload(rutaArchivo, imagenBuffer, {
          contentType: this.obtenerContentType(extension),
          upsert: false
        });

      if (error) {
        this.logger.error('Error al subir imagen:', error.message);
        throw new Error('Error al subir la imagen');
      }

      // Obtener URL pública
      const { data: urlData } = this.supabaseService
        .getClient()
        .storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      this.logger.log(`Imagen subida exitosamente: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (err: any) {
      this.logger.error('Error en subirImagen:', err.message);
      throw new Error('Error al subir la imagen');
    }
  }

  // Método auxiliar para obtener content type
  private obtenerContentType(extension: string): string {
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return contentTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  // Método para eliminar imagen del storage
  async eliminarImagen(urlImagen: string): Promise<void> {
    try {
      // Extraer la ruta del archivo de la URL
      const rutaArchivo = urlImagen.split('/').slice(-2).join('/'); // users/user-id/uuid.ext
      
      const { error } = await this.supabaseService
        .getClient()
        .storage
        .from(this.bucketName)
        .remove([rutaArchivo]);

      if (error) {
        this.logger.error('Error al eliminar imagen:', error.message);
        // No lanzamos error para no bloquear la eliminación del registro
      } else {
        this.logger.log(`Imagen eliminada: ${rutaArchivo}`);
      }
    } catch (err: any) {
      this.logger.error('Error en eliminarImagen:', err.message);
    }
  }

  // Crear un nuevo plato escaneado con imagen
  async crearPlatoEscaneadoConImagen(
    datos: {
      analisis: string;
      id_usuario: string;
    },
    imagenFile: Express.Multer.File
  ) {
    let imagenUrl: string | null = null;

    try {
      // 1. Subir imagen a Supabase Storage
      imagenUrl = await this.subirImagen(
        imagenFile.buffer,
        imagenFile.originalname,
        datos.id_usuario
      );

      // 2. Contar historiales para el nombre
      const { count } = await this.supabaseService
        .getClient()
        .from('historial_escaneo')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', datos.id_usuario);

      const numeroHistorial = (count || 0) + 1;
      const nombre = `Historial ${numeroHistorial}`;

      // 3. Crear plato en la base de datos
      const { data: platoData, error: platoError } = await this.supabaseService
        .getClient()
        .from('platos_escaneados')
        .insert({
          nombre: nombre,
          analisis: datos.analisis,
          imagen_url: imagenUrl
        })
        .select()
        .single();

      if (platoError) {
        this.logger.error('Error al crear plato escaneado:', platoError.message);
        // Si falla, eliminar la imagen subida
        if (imagenUrl) {
          await this.eliminarImagen(imagenUrl);
        }
        throw new Error('Error al crear el plato escaneado');
      }

      // 4. Crear registro en historial
      const { error: histError } = await this.supabaseService
        .getClient()
        .from('historial_escaneo')
        .insert({
          id_usuario: datos.id_usuario,
          id_plato: platoData.id_plato
        });

      if (histError) {
        this.logger.error('Error al crear historial:', histError.message);
        // Si falla, eliminar plato e imagen
        await this.supabaseService.getClient()
          .from('platos_escaneados')
          .delete()
          .eq('id_plato', platoData.id_plato);
        if (imagenUrl) {
          await this.eliminarImagen(imagenUrl);
        }
        throw new Error('Error al crear el historial');
      }

      return {
        ...platoData,
        nombre: nombre
      };

    } catch (err: any) {
      this.logger.error('Error al crear plato escaneado con imagen:', err.message);
      // Limpiar imagen si hubo error
      if (imagenUrl) {
        await this.eliminarImagen(imagenUrl);
      }
      throw new Error('Error al crear el plato escaneado');
    }
  }

  // Listar todos los platos escaneados de un usuario
  async listarPlatosEscaneados(idUsuario: string) {
    if (!idUsuario) {
      throw new Error('El id_usuario es requerido');
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('historial_escaneo')
        .select(`
          id_escaneo,
          fecha,
          platos_escaneados (
            id_plato,
            nombre,
            analisis,
            fecha_escaneo,
            imagen_url
          )
        `)
        .eq('id_usuario', idUsuario)
        .order('fecha', { ascending: false });

      if (error) {
        this.logger.error('Error al listar platos escaneados:', error.message);
        throw new Error('Error al obtener los platos escaneados');
      }

      return (data ?? []).map((row: any) => ({
        id_escaneo: row.id_escaneo,
        id_plato: row.platos_escaneados.id_plato,
        nombre: row.platos_escaneados.nombre,
        analisis: row.platos_escaneados.analisis,
        fecha_escaneo: row.platos_escaneados.fecha_escaneo,
        imagen_url: row.platos_escaneados.imagen_url,
        fecha_historial: row.fecha
      }));
    } catch (err: any) {
      this.logger.error('Error al obtener los platos escaneados', err.message);
      throw new Error('Error al obtener los platos escaneados');
    }
  }

  // Obtener historial simplificado para sidebar
  async obtenerHistorialSidebar(idUsuario: string) {
    if (!idUsuario) {
      throw new Error('El id_usuario es requerido');
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('historial_escaneo')
        .select(`
          id_escaneo,
          fecha,
          platos_escaneados (
            id_plato,
            nombre,
            imagen_url
          )
        `)
        .eq('id_usuario', idUsuario)
        .order('fecha', { ascending: false })
        .limit(10);

      if (error) {
        this.logger.error('Error al obtener historial sidebar:', error.message);
        throw new Error('Error al obtener el historial');
      }

      // Generar nombres automáticos "Historial 1", "Historial 2", etc.
      const historialConNombres = (data ?? []).map((row: any, index: number) => ({
        id_escaneo: row.id_escaneo,
        id_plato: row.platos_escaneados.id_plato,
        fecha: row.fecha,
        nombre: `Historial ${index + 1}`,
        imagen_url: row.platos_escaneados.imagen_url
      }));

      return historialConNombres;
    } catch (err: any) {
      this.logger.error('Error al obtener historial sidebar', err.message);
      throw new Error('Error al obtener el historial');
    }
  }

  // Obtener detalle de un plato por id_plato
  async obtenerDetallePlato(idPlato: string) {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('platos_escaneados')
        .select('*')
        .eq('id_plato', idPlato)
        .single();

      if (error) {
        this.logger.error(`Error al obtener el plato ${idPlato}:`, error.message);
        throw new Error('Error al obtener el detalle del plato');
      }

      return data;
    } catch (err: any) {
      this.logger.error(`Error al obtener detalle del plato ${idPlato}`, err.message);
      throw new Error('Error al obtener el detalle del plato');
    }
  }

  // Eliminar un plato (y su imagen del storage)
  async eliminarPlato(idPlato: string) {
    try {
      // Primero obtener la URL de la imagen
      const { data: platoData } = await this.supabaseService
        .getClient()
        .from('platos_escaneados')
        .select('imagen_url')
        .eq('id_plato', idPlato)
        .single();

      // Eliminar del historial
      const { error: histErr } = await this.supabaseService
        .getClient()
        .from('historial_escaneo')
        .delete()
        .eq('id_plato', idPlato);

      if (histErr) {
        this.logger.error(`Error al eliminar historial del plato ${idPlato}:`, histErr.message);
        throw new Error('Error al eliminar el historial del plato');
      }

      // Eliminar el plato
      const { error } = await this.supabaseService
        .getClient()
        .from('platos_escaneados')
        .delete()
        .eq('id_plato', idPlato);

      if (error) {
        this.logger.error(`Error al eliminar el plato ${idPlato}:`, error.message);
        throw new Error('Error al eliminar el plato');
      }

      // Eliminar la imagen del storage si existe
      if (platoData?.imagen_url) {
        await this.eliminarImagen(platoData.imagen_url);
      }

      this.logger.log(`Plato ${idPlato} eliminado correctamente`);
      return { message: 'Plato eliminado correctamente' };
    } catch (err: any) {
      this.logger.error(`Error al eliminar el plato ${idPlato}`, err.message);
      throw new Error('Error al eliminar el plato');
    }
  }
}