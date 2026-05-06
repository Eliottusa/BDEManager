import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  registrationId: string;

  @IsNotEmpty()
  @IsString()
  successUrl: string;

  @IsNotEmpty()
  @IsString()
  cancelUrl: string;
}

export class PaymentResponseDto {
  paymentId: string;
  checkoutSessionId: string;
  url: string;
}