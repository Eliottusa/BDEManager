import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  // TODO Timéo — createCheckoutSession(eventId, userId): Stripe Checkout, retourne l'URL de paiement
  // TODO Timéo — handleWebhook(rawBody, signature): confirmer paiement → mettre à jour Registration + Payment
  // TODO Timéo — refund(paymentId): rembourser via Stripe
}
