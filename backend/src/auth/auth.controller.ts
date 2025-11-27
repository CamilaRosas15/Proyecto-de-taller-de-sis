import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param, BadRequestException, NotFoundException, Headers, UnauthorizedException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService, ProfileDto as AuthServiceProfileDto } from './auth/auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

// DTOs para validación de entrada
class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`Attempting to register user: ${dto.email}`);
    const result = await this.authService.register(dto);
    return {
      message: 'User registered successfully. Please complete your profile.',
      userId: result.data.user?.id,
      email: dto.email,
      accessToken: result.data.session?.access_token ?? null,
      refreshToken: result.data.session?.refresh_token ?? null,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`Attempting to log in user: ${dto.email}`);
    const result = await this.authService.login(dto);
    return {
      message: 'Logged in successfully',
      accessToken: result.data.session?.access_token,
      refreshToken: result.data.session?.refresh_token,
      user: result.data.user,
    };
  }

  @Post('profile/:userId') 
  @HttpCode(HttpStatus.OK)
  async saveProfile(@Param('userId') userId: string, @Body() profileDto: AuthServiceProfileDto) {
    if (!userId) {
      throw new BadRequestException('User ID is required in the URL parameter.');
    }
    this.logger.log(`Saving profile for user ID: ${userId}`);
    const savedProfile = await this.authService.saveUserProfile(userId, profileDto);
    return { message: 'User profile saved successfully', profile: savedProfile };
  }

  @Get('profile/:userId')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Param('userId') userId: string): Promise<AuthServiceProfileDto> {
    if (!userId) {
      throw new BadRequestException('User ID is required in the URL parameter.');
    }
    this.logger.log(`Fetching profile for user ID: ${userId}`);
    const userProfile = await this.authService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException(`Profile for user ID ${userId} not found.`);
    }
    return userProfile;
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Headers('Authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    this.logger.log(`Getting current user with token`);
    const currentUser = await this.authService.getCurrentUser(token);
    return currentUser;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    this.logger.log('Refreshing session using refreshToken');
    const result = await this.authService.refreshSession(refreshToken);
    return {
      accessToken: result.accessToken ?? null,
      refreshToken: result.refreshToken ?? null,
      user: result.user ?? null,
    };
  }

  // 📸 NUEVO: Endpoint para subir foto de perfil
  @Post('profile/:userId/upload-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') auth: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const token = auth?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Verificar que el usuario está autenticado
    const currentUser = await this.authService.getCurrentUser(token);
    if (currentUser.id !== userId) {
      throw new UnauthorizedException('No tienes permiso para modificar este perfil');
    }

    this.logger.log(`📸 Uploading profile picture for user: ${userId}`);

    // Eliminar foto antigua antes de subir la nueva
    await this.authService.deleteOldProfilePicture(userId);

    // Subir nueva foto
    const publicUrl = await this.authService.uploadProfilePicture(userId, file);

    return {
      message: 'Foto de perfil actualizada exitosamente',
      url: publicUrl,
    };
  }
}