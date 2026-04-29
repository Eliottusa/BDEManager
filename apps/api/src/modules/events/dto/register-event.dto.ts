import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class RegisterEventDto {
  @ApiProperty({ example: "clx123..." })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
