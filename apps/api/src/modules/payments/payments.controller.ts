import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Req,
  BadRequestException,
  NotFoundException,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /api/v1/payments/checkout-sessions
  // Crée une session Stripe Checkout.
  // Réservé aux utilisateurs connectés : sans garde, n'importe qui pourrait
  // générer des sessions Stripe à partir d'un registrationId arbitraire et
  // fournir ses propres success/cancel URLs. Le flux normal passe de toute
  // façon par /events/:id/register (appel interne au service).
  @Post('checkout-sessions')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createCheckoutSession(dto);
  }

  // GET /api/v1/payments/verify?session_id=...
  // Appelé par la page /checkout/success (utilisateur connecté de retour de
  // Stripe) -> on exige le JWT pour ne pas exposer publiquement le statut d'un
  // paiement à partir d'un session_id.
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Query('session_id') sessionId: string,
  ): Promise<{ verified: boolean }> {
    if (!sessionId) {
      throw new BadRequestException('session_id is required');
    }
    const payment = await this.paymentsService.getPaymentBySession(sessionId);
    if (!payment || payment.status !== 'PAID') {
      throw new NotFoundException('Payment not confirmed');
    }
    return { verified: true };
  }

  /* Stripe Webhook endpoint
   *   - Le body est RAW (Buffer) car configuré dans main.ts
   *   - On vérifie la structure Stripe avant traitement
   */
  @Post('webhooks/stripe')
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>): Promise<{ received: boolean }> {
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
