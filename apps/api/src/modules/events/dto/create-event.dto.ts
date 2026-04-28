import { IsString, IsInt, IsOptional, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { EventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  titre!: string; 

  @IsOptional()
  @IsString()
  description?: string; 

  @IsString()
  lieu!: string;

  @IsDateString() 
  dateHeure!: string;

  @IsInt()
  @Min(1)
  capaciteMax!: number;

  @IsNumber()
  @Min(0)
  prix!: number;

  @IsOptional()
  @IsEnum(EventStatus)
  statut?: EventStatus;
}