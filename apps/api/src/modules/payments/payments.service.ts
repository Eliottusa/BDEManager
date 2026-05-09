import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

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
      // #region Récupérer l'inscription et valider son existance
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
      // #endregion

      // Gérer les paiements existants selon leur statut
      if (registration.payment) {
        // Si le paiement est en attente, retourner l'URL existante
        if (registration.payment.status === 'PENDING') {
          try {
            // Vérifier que la session Stripe existe toujours et est valide
            const existingSession = await this.stripe.checkout.sessions.retrieve(
              registration.payment.stripeSessionId,
            );

            if (existingSession.status === 'open') {
              // Vérifier que l'URL est présente et valide
              if (existingSession.url) {
                return {
                  paymentId: registration.payment.id,
                  checkoutSessionId: registration.payment.stripeSessionId,
                  url: existingSession.url,
                };
              } else {
                // Session ouverte mais sans URL - fermer et en créer une nouvelle
                try {
                  await this.stripe.checkout.sessions.expire(existingSession.id);
                } catch (expireError) {
                  this.logger.warn(
                    `Failed to expire session ${existingSession.id}: ${
                      expireError instanceof Error ? expireError.message : 'Unknown error'
                    }`,
                  );
                }
              }
            }
            
            // Session terminée et payée
            if (
            existingSession.status === 'complete' &&
            existingSession.payment_status === 'paid'
            ) {
              // Si on retombe ici (ex: webhook non reçu), on resynchronise la DB.
              await this.handleCheckoutSessionPaid(existingSession);
              throw new BadRequestException('Payment already completed');
            }
          } catch (error) {
            this.logger.warn(
              `Failed to retrieve existing session, will create new one: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            );
          }
        }

        // Si le paiement est confirmé, retourner une erreur
        if (registration.payment.status === 'PAID') {
          throw new BadRequestException(
            'Payment already confirmed for this registration',
          );
        }
      }

      const event = registration.event;
      const user = registration.user;

      // #region Verifier les éléments avant de créer un paiement
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
      // #endregion

      // #region Créer la session Stripe
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
        payment_method_types: ['card'],
        success_url: dto.successUrl,
        cancel_url: dto.cancelUrl,
        metadata: {
          registrationId: registration.id,
          userId: registration.userId,
          eventId: registration.eventId,
        },
        payment_intent_data: {
          metadata: {
            registrationId: registration.id,
            userId: registration.userId,
            eventId: registration.eventId,
          },
        },
      });

      if (!session.url) {
        throw new BadRequestException('Stripe session URL not available');
      }
      // #endregion

      // Si un paiement FAILED existe, le mettre à jour
      // Sinon créer un nouveau paiement
      let payment;
      if (registration.payment) {
        payment = await this.prisma.payment.update({
          where: { id: registration.payment.id },
          data: {
            stripeSessionId: session.id,
            stripePaymentId: null,
            amount: event.price,
            currency: 'eur',
            status: 'PENDING',
          },
        });
      } else {
        payment = await this.prisma.payment.create({
          data: {
            stripeSessionId: session.id,
            amount: event.price,
            currency: 'eur',
            status: 'PENDING',
            registrationId: registration.id,
            userId: registration.userId,
            eventId: registration.eventId,
          },
        });
      }

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
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    let event: Stripe.Event;

    // #region Valider la signature du webhook
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
      this.logger.debug(`Webhook validated successfully, event type: ${event.type}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook error: ${errorMessage}`);
      throw new BadRequestException(
        `Webhook signature verification failed: ${errorMessage}`,
      );
    }
    // #endregion 

    // #region Traiter les événements Checkout / PaymentIntent
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'checkout.session.async_payment_succeeded':
        await this.handleCheckoutSessionAsyncPaymentSucceeded(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'checkout.session.async_payment_failed':
        await this.handleCheckoutSessionAsyncPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
    // #endregion
  }

  // Traite l'événement checkout.session.completed
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
      this.logger.log(
        `Checkout session ${session.id} completed but not paid yet (payment_status=${session.payment_status})`,
      );
      return;
    }

    await this.handleCheckoutSessionPaid(session);
  }

  // Traite l'événement checkout.session.async_payment_succeeded
  private async handleCheckoutSessionAsyncPaymentSucceeded(
    session: Stripe.Checkout.Session,
  ) {
    if (session.payment_status !== 'paid') {
      this.logger.warn(
        `Async payment succeeded event received but session ${session.id} is not paid (payment_status=${session.payment_status})`,
      );
      return;
    }

    await this.handleCheckoutSessionPaid(session);
  }

  // Logique commune: session Checkout payée -> payer + confirmer inscription
  private async handleCheckoutSessionPaid(session: Stripe.Checkout.Session) {
    const payment = await this.getPaymentBySession(session.id);

    if (!payment) {
      this.logger.error(`Payment not found for paid session ${session.id}`);
      return;
    }

    // Vérifier l'idempotence - ne pas retraiter si déjà payé
    if (payment.status === 'PAID') {
      this.logger.debug(`Payment ${payment.id} already processed`);
      return;
    }

    //#region Double-check montant/devise (évite de confirmer un paiement incohérent)
    const expectedAmountCents = Math.round(payment.amount * 100);
    const sessionAmountCents = session.amount_total ?? null;
    const sessionCurrency = session.currency ?? null;

    if (sessionAmountCents === null) {
      this.logger.warn(
        `Paid session ${session.id} has no amount_total; skipping amount check`,
      );
    } else if (sessionAmountCents !== expectedAmountCents) {
      this.logger.error(
        `Amount mismatch for payment ${payment.id}: expected=${expectedAmountCents} received=${sessionAmountCents} (session=${session.id})`,
      );
      return;
    }

    if (sessionCurrency === null) {
      this.logger.warn(
        `Paid session ${session.id} has no currency; skipping currency check`,
      );
    } else if (sessionCurrency.toLowerCase() !== payment.currency.toLowerCase()) {
      this.logger.error(
        `Currency mismatch for payment ${payment.id}: expected=${payment.currency} received=${sessionCurrency} (session=${session.id})`,
      );
      return;
    }
    //#endregion

    // Mettre à jour le paiement
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        stripePaymentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      },
    });

    // Mettre à jour l'inscription
    await this.confirmPaymentInRegistration(payment.registrationId, payment.id);
  }

  // Traite l'événement checkout.session.async_payment_failed
  private async handleCheckoutSessionAsyncPaymentFailed(
    session: Stripe.Checkout.Session,
  ) {
    const payment = await this.getPaymentBySession(session.id);

    if (!payment) {
      this.logger.error(`Payment not found for failed session ${session.id}`);
      return;
    }

    if (payment.status === 'PAID') {
      this.logger.warn(
        `Async payment failed received for already paid payment ${payment.id}`,
      );
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
      },
    });
  }

  // Traite l'événement checkout.session.expired
  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    const payment = await this.getPaymentBySession(session.id);

    if (!payment) {
      this.logger.error(`Payment not found for expired session ${session.id}`);
      return;
    }

    if (payment.status === 'PENDING') {
      // Mettre à jour le paiement
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'EXPIRED',
        },
      });
    }
  }

  // Confirme le paiement pour l'inscription
  private async confirmPaymentInRegistration(
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
}
