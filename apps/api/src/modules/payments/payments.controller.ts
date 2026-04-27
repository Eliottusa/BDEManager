import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /api/v1/payments/checkout   — créer une Stripe Checkout Session
  // POST /api/v1/payments/webhook    — webhook Stripe (raw body requis)
}
