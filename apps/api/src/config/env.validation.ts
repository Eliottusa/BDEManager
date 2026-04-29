import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  REDIS_HOST = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT = 6379;

  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_TTL = 86400;

  @IsString()
  @IsOptional()
  SMTP_HOST = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  SMTP_PORT = 1025;

  @IsString()
  @IsOptional()
  SMTP_USER = '';

  @IsString()
  @IsOptional()
  SMTP_PASS = '';

  @IsString()
  @IsOptional()
  SMTP_FROM = 'BDE Manager <noreply@bde-manager.fr>';

  @IsString()
  @IsOptional()
  GEO_API_URL = 'https://api-adresse.data.gouv.fr';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  const hasUser = validatedConfig.SMTP_USER.trim().length > 0;
  const hasPass = validatedConfig.SMTP_PASS.trim().length > 0;
  if (hasUser !== hasPass) {
    const missing = hasUser ? 'SMTP_PASS' : 'SMTP_USER';
    throw new Error(
      `Environment validation failed: ${missing} is missing. Both SMTP_USER and SMTP_PASS must be provided together, or both omitted.`,
    );
  }

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
