import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { EventStatus } from "@prisma/client";

export class UpdateEventStatusDto {
  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.OUVERT,
    description: "Le nouveau statut de l'événement",
  })
  @IsEnum(EventStatus)
  @IsNotEmpty()
  status!: EventStatus;
}
