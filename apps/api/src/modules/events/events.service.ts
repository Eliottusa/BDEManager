import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventStatus, RegistrationStatus } from "@prisma/client";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  // --- GESTION EVENTS ---

  async getAllEvents() {
    return this.prisma.event.findMany({
      include: { organizer: true }, // Optionnel : pour avoir les infos du créateur
    });
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { registrations: true },
    });

    if (!event) {
      throw new NotFoundException(`Événement ${id} introuvable`);
    }
    return event;
  }

  async createEvent(data: any) {
    return this.prisma.event.create({
      data: {
        ...data,
        status: data.status || EventStatus.BROUILLON,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        capacity: data.capacity,
        price: data.price || 0,
        organizerId: data.organizerId,
      },
    });
  }

  async updateStatus(id: string, status: EventStatus) {
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  // --- GESTION INSCRIPTIONS ---

  async registerUser(eventId: string, userId: string) {
    // 1. Vérifications de base (comme ton code Spring Boot)
    const event = await this.getEventById(eventId);

    if (event.status !== EventStatus.OUVERT) {
      throw new BadRequestException("Inscriptions fermées pour cet événement");
    }

    const currentRegistrations = await this.prisma.registration.count({
      where: { eventId },
    });

    if (currentRegistrations >= event.capacity) {
      await this.updateStatus(eventId, EventStatus.COMPLET);
      throw new BadRequestException("L'événement est désormais complet");
    }

    // 2. Création de l'inscription en base
    const registration = await this.prisma.registration.create({
      data: {
        eventId: eventId,
        userId: userId,
        status: RegistrationStatus.PENDING,
      },
    });

    // 3. Si l'événement est payant, on génère la session Stripe du collègue
    if (event.price > 0) {
      return this.paymentsService.createCheckoutSession({
        registrationId: registration.id,
        // Ici, tu définis où l'utilisateur est redirigé après le paiement
        successUrl: `http://localhost:3000/payment/success?registrationId=${registration.id}`,
        cancelUrl: `http://localhost:3000/payment/cancel?registrationId=${registration.id}`,
      });
    }

    // 4. Si c'est gratuit, on retourne juste l'inscription
    return {
      message: "Inscription gratuite réussie",
      registration,
    };
  }

  async getUserRegistrations(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
      include: { event: true }, // Pour voir les détails de l'event associé
    });
  }
}
