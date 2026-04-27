import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/register
  // POST /api/v1/auth/login
  // POST /api/v1/auth/logout
  // POST /api/v1/auth/refresh
}
