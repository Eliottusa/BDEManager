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

  /**
   * POST /api/v1/payments/webhooks/stripe
   * Webhook Stripe — reçoit les événements
   * Important: le body brut est nécessaire pour valider la signature
   */
  @Post('webhooks/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Missing or invalid raw body');
    }

    await this.paymentsService.handleWebhook(rawBody, signature);

    return { received: true };
  }
}
