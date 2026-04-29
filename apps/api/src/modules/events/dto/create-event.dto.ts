import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  IsNotEmpty,
} from "class-validator";
import { EventStatus } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  // Location
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressLabel!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressStreet!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressCity!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressZip!: string;

  // Dates
  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  // Capacity & Price
  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizerId!: string; // L'ID de l'admin qui crée l'event

  @ApiProperty({ enum: EventStatus, default: EventStatus.BROUILLON })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
