import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param, BadRequestException, NotFoundException, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService,ProfileDto as AuthServiceProfileDto} from './auth/auth.service';
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

// ❌ ¡Eliminamos la definición duplicada de ProfileDto aquí!
// Ahora, cuando se use 'ProfileDto' en el controlador, se referirá a 'AuthServiceProfileDto'.

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`Attempting to register user: ${dto.email}`);
    const result = await this.authService.register(dto);
    return { message: 'User registered successfully. Please complete your profile.', userId: result.data.user?.id, email: dto.email };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`Attempting to log in user: ${dto.email}`);
    const result = await this.authService.login(dto);
    return { message: 'Logged in successfully', accessToken: result.data.session?.access_token, user: result.data.user };
  }

  @Post('profile/:userId') 
  // Endpoint para guardar/actualizar el perfil
  @HttpCode(HttpStatus.OK)
  // ✅ Usamos AuthServiceProfileDto directamente como el tipo para el body
  async saveProfile(@Param('userId') userId: string, @Body() profileDto: AuthServiceProfileDto) {
      if (!userId) {
          throw new BadRequestException('User ID is required in the URL parameter.');
      }
      this.logger.log(`Saving profile for user ID: ${userId}`);
      const savedProfile = await this.authService.saveUserProfile(userId, profileDto);
      return { message: 'User profile saved successfully', profile: savedProfile };
  }

  @Get('profile/:userId') // Endpoint para obtener el perfil
  @HttpCode(HttpStatus.OK)
  // ✅ Usamos AuthServiceProfileDto directamente como el tipo de retorno
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
}