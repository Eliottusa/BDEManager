import {
  ConflictException, Inject, Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 jours
const USER_TTL    = 60 * 5;            // 5 minutes

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Un compte existe déjà avec cet email');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({ ...dto, password: hashed });

    this.logger.log(`Nouvel utilisateur : ${user.email}`);
    await this.setUserCache(user);
    return this.buildTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    this.logger.log(`Login : ${user.email}`);
    await this.setUserCache(user);
    return this.buildTokens(user);
  }

  async logout(userId: string) {
    await Promise.all([
      this.cache.del(`refresh_token:${userId}`),
      this.cache.del(`user:${userId}`),
    ]);
  }

  async refresh(userId: string, incomingToken: string) {
    const stored = await this.cache.get<string>(`refresh_token:${userId}`);
    if (!stored || stored !== incomingToken) {
      await this.cache.del(`refresh_token:${userId}`);
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    return this.buildTokens(user);
  }

  async getMe(userId: string): Promise<SafeUser> {
    const cached = await this.cache.get<SafeUser>(`user:${userId}`);
    if (cached) {
      this.logger.debug(`Cache HIT user:${userId}`);
      return cached;
    }

    this.logger.debug(`Cache MISS user:${userId}`);
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    await this.setUserCache(user);
    const { password: _, ...safe } = user;
    return safe;
  }
 

  private async buildTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET ?? 'fallback_dev_secret',
        expiresIn: 900, // 15 min
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'fallback_dev_refresh_secret',
        expiresIn: 604800, // 7 jours
      }),
    ]);

    await this.cache.set(`refresh_token:${user.id}`, refreshToken, REFRESH_TTL);

    const { password: _, ...safe } = user;
    return { accessToken, refreshToken, user: safe };
  }

  private async setUserCache(user: User) {
    const { password: _, ...safe } = user;
    await this.cache.set(`user:${user.id}`, safe, USER_TTL);
  }
}
