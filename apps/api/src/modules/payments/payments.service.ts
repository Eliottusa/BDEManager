import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutSessionDto, PaymentResponseDto } from './dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // Crée une session Stripe Checkout et retourne l'URL de paiement
  async createCheckoutSession( 
    dto: CreateCheckoutSessionDto,
  ): Promise<PaymentResponseDto> {
    try {
      // Récupérer l'inscription et valider son existance
      const registration = await this.prisma.registration.findUnique({
        where: { id: dto.registrationId },
        include: {
          event: true,
          user: true,
          payment: true,
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found');
      }

      // Vérifier que l'inscription n'a pas déjà un paiement en cours/confirmé
      if (registration.payment) {
        throw new BadRequestException('Payment already exists for this registration');
      }

      const event = registration.event;
      const user = registration.user;

      // Valider que l'événement n'est pas gratuit
      if (event.isFree || event.price <= 0) {
        throw new BadRequestException('Cannot create payment for free event');
      }

      // Valider le montant
      if (!Number.isFinite(event.price) || event.price <= 0) {
        throw new BadRequestException('Invalid event price');
      }

      // Valider l'email utilisateur
      if (!user.email) {
        throw new BadRequestException('User email is required for payment');
      }

      // Créer la session Stripe
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(event.price * 100), // Stripe utilise les centimes
              product_data: {
                name: event.title,
                description: event.description,
                images: event.imageUrl ? [event.imageUrl] : undefined,
              },
            },
          },
        ],
        success_url: dto.successUrl,
        cancel_url: dto.cancelUrl,
        metadata: {
          registrationId: registration.id,
          userId: registration.userId,
          eventId: registration.eventId,
        },
      });

      if (!session.url) {
        throw new BadRequestException('Stripe session URL not available');
      }

      // Créer l'enregistrement Payment en BD
      const payment = await this.prisma.payment.create({
        data: {
          stripeSessionId: session.id,
          stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          amount: event.price,
          currency: 'eur',
          status: 'PENDING',
          registrationId: registration.id,
          userId: registration.userId,
          eventId: registration.eventId,
        },
      });

      return {
        paymentId: payment.id,
        checkoutSessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to create checkout session: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  // Traite le webhook Stripe et met à jour le statut du paiement
  async handleWebhook(
    rawBody: Buffer | string,
    signature: string,
  ): Promise<void> {
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new BadRequestException(
          'STRIPE_WEBHOOK_SECRET environment variable is not set',
        );
      }

      // Valider la signature du webhook
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(
        `Webhook signature verification failed: ${errorMessage}`,
      );
    }

    // Traiter les événements checkout
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
    }
  }

  // Traite l'événement checkout.session.completed suite au webhook
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const registrationId = session.metadata?.registrationId;

    if (!registrationId) {
      this.logger.warn(`No registrationId in session metadata for session ${session.id}`);
      throw new BadRequestException('Missing registrationId in session metadata');
    }

    const payment = await this.getPaymentBySession(session.id);

    if (!payment) {
      this.logger.error(`Payment not found for session ${session.id}`);
      throw new BadRequestException(`Payment not found for session ${session.id}`);
    }

    // Vérifier l'idempotence - ne pas retraiter si déjà payé
    if (payment.status === 'PAID') {
      this.logger.debug(`Payment ${payment.id} already processed`);
      return;
    }

    // Mettre à jour le paiement
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: session.payment_status === 'paid' ? 'PAID' : 'PENDING',
        stripePaymentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : payment.stripePaymentId,
      },
    });

    // Si le paiement est confirmé, mettre à jour l'inscription
    if (session.payment_status === 'paid') {
      await this.confirmPaymentInRegistration(registrationId, payment.id);
    }
  }

  // Traite l'événement payment_intent.succeeded suite au webhook
  private async handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    const registrationId = intent.metadata?.registrationId;

    if (!registrationId) {
      this.logger.warn(`No registrationId in intent metadata for intent ${intent.id}`);
      throw new BadRequestException('Missing registrationId in intent metadata');
    }

    // Trouver et mettre à jour le Payment
    const payment = await this.getPaymentByStripeIntentId(intent.id);

    if (!payment) {
      this.logger.error(`Payment not found for intent ${intent.id}`);
      throw new BadRequestException(`Payment not found for intent ${intent.id}`);
    }

    // Vérifier l'idempotence
    if (payment.status === 'PAID') {
      this.logger.debug(`Payment ${payment.id} already processed from intent`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID' },
    });

    // Confirmer le paiement dans l'inscription
    await this.confirmPaymentInRegistration(registrationId, payment.id);
  }

  // Traite l'événement payment_intent.payment_failed suite au webhook
  private async handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
    const registrationId = intent.metadata?.registrationId;

    if (!registrationId) {
      this.logger.warn(`No registrationId in failed intent metadata for intent ${intent.id}`);
      throw new BadRequestException('Missing registrationId in failed intent metadata');
    }

    // Trouver et mettre à jour le Payment
    const payment = await this.getPaymentByStripeIntentId(intent.id);

    if (!payment) {
      this.logger.error(`Payment not found for failed intent ${intent.id}`);
      throw new BadRequestException(`Payment not found for failed intent ${intent.id}`);
    }

    // Ne mettre à jour que si pas déjà en FAILED
    if (payment.status !== 'FAILED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      this.logger.warn(`Payment ${payment.id} marked as FAILED`);
    }
  }

  // Confirme le paiement
  async confirmPaymentInRegistration(
    registrationId: string,
    paymentId: string,
  ): Promise<void> {
    // Vérifier que le paiement est bien PAID
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    // TODO: Choisir ici pour la confirmatino de paiement
    // Soit mettre à jour direct l'inscription
    // Soit call l'url de la partie inscription ou une fonction

    // Pour dev test Mettre à jour l'inscription avec le statut CONFIRMED

    if (!payment || payment.status !== 'PAID') {
      console.error(`Payment ${paymentId} is not in PAID status`);
      return;
    }
    
    await this.prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: 'CONFIRMED',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Registration ${registrationId} confirmed after payment ${paymentId}`);
  }

  // Récupère les informations d'un paiement
  async getPayment(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }

  // Récupère les informations d'un paiement par session Stripe
  async getPaymentBySession(sessionId: string) {
    return this.prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
    });
  }

  // Récupère un paiement par Stripe PaymentIntent ID
  private async getPaymentByStripeIntentId(intentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: intentId },
    });
    if (!payment) {
      this.logger.error(`No payment found with stripePaymentId: ${intentId}`);
    }
    return payment;
  }
}
