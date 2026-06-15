import { Body, Controller,Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards,} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Front (app.*) et API (api.*) sont sur des domaines distincts : les requêtes
// XHR vers l'API sont donc "cross-site". sameSite:'strict'/'lax' empêcherait le
// navigateur d'envoyer le cookie d'auth -> déconnexion au refresh / 401 sur les
// routes protégées. En prod (toujours derrière HTTPS via Caddy) on passe en
// sameSite:'none' + secure:true (obligatoire pour un cookie cross-site). En dev
// http local (front+api sur localhost, same-site) on garde 'lax' car 'none'
// exigerait secure:true, impossible sans HTTPS.
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un compte' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se déconnecter' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    // Mêmes attributs que la pose, sinon certains navigateurs n'effacent pas.
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    return { message: 'Déconnecté avec succès' };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les tokens' })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.refresh(
      req.user.sub,
      req.user.refreshToken,
    );
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Profil utilisateur connecté (cache Redis)' })
  me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 min
    });
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });
  }
}
