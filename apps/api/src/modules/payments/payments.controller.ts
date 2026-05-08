import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto, PaymentResponseDto } from './dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /api/v1/payments/checkout-sessions
  // Crée une session Stripe Checkout
  @Post('checkout-sessions')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createCheckoutSession(dto);
  }

  /* Stripe Webhook endpoint
   *   - Le body est RAW (Buffer) car configuré dans main.ts
   *   - On vérifie la structure Stripe avant traitement
   */
  @Post('webhooks/stripe')
  async handleStripeWebhook(@Req() req: Request): Promise<{ received: boolean }> {
    const signature = req.headers['stripe-signature'] as string;

    // Vérification header Stripe obligatoire
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Récupération du body RAW (Buffer)
    const rawBody = req.body;

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException(
        'Invalid raw body - Stripe webhook requires raw Buffer',
      );
    }

    // Délégation au service
    await this.paymentsService.handleWebhook(rawBody, signature);

    return { received: true };
  }
}
