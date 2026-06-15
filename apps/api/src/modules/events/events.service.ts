import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventStatus, RegistrationStatus } from "@prisma/client";
import { PaymentsService } from "../payments/payments.service";
import { MailService } from "../mail/mail.service";
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private mailService: MailService,
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
    const price = data.price || 0;
    return this.prisma.event.create({
      data: {
        ...data,
        addressStreet: data.addressStreet || '',
        addressLabel: data.addressLabel || '',
        addressCity: data.addressCity || '',
        addressZip: data.addressZip || '',
        status: data.status || EventStatus.BROUILLON,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        capacity: data.capacity,
        price,
        isFree: data.isFree !== undefined ? data.isFree : price === 0,
        organizerId: data.organizerId,
      },
    });
  }
  // --- METRE À JOUR UN ÉVÉNEMENT (PATCH) ---
  async updateEvent(id: string, updateData: any) {
    // 1. On vérifie d'abord si l'événement existe
    await this.getEventById(id);

    // 2. On applique les modifications
    return this.prisma.event.update({
      where: { id },
      data: {
        ...updateData,
        // On gère la réassignation propre des dates si elles sont fournies
        ...(updateData.startDate && {
          startDate: new Date(updateData.startDate),
        }),
        ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
      },
    });
  }

  // --- SUPPRIMER UN ÉVÉNEMENT (DELETE) ---
  async deleteEvent(id: string) {
    // 1. On vérifie d'abord si l'événement existe
    await this.getEventById(id);

    // Supprimer les inscriptions liées (cascading manuel si non géré dans Prisma)
    await this.prisma.registration.deleteMany({
      where: { eventId: id },
    });

    // 3. Suppression de l'événement
    return this.prisma.event.delete({
      where: { id },
    });
  }
  // --- UPDATE UN STATUT D'EVENT ---
  async updateStatus(id: string, status: EventStatus) {
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  // --- GESTION INSCRIPTIONS ---

  async registerUser(eventId: string, userId: string) {
    // 1. Vérifications de base
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
      include: { user: true },
    });

    // 3. Si l'événement est payant, on génère la session Stripe
    if (event.price > 0) {
      // URL publique du front (Caddy en prod, localhost en dev). Doit matcher
      // FRONTEND_URL (utilisé aussi pour le CORS) — pas de host en dur.
      const frontendUrl = (
        process.env.FRONTEND_URL || "http://localhost:3000"
      ).replace(/\/$/, "");
      // L'app est localisée ([locale]) : on cible la locale par défaut.
      const locale = "fr";
      return this.paymentsService.createCheckoutSession({
        registrationId: registration.id,
        // Stripe remplace {CHECKOUT_SESSION_ID} par l'id réel de la session.
        // La page /checkout/success lit ?session_id pour appeler /payments/verify.
        successUrl: `${frontendUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        // Pas de page d'annulation dédiée : retour sur la fiche de l'événement.
        cancelUrl: `${frontendUrl}/${locale}/events/${eventId}`,
      });
    }

    // 4. Si c'est gratuit, on retourne juste l'inscription
    try {
      // On appelle la méthode de ton collègue
      await this.mailService.sendEventConfirmation(registration.user.email, {
        firstName: registration.user.firstName || "Étudiant",
        eventName: event.title,
        eventDate: event.startDate.toLocaleDateString("fr-FR"),
        eventLocation:
          event.addressLabel || event.addressCity || "Non spécifié",
        actionUrl: `http://localhost:3000/tickets/${registration.id}`,
      });
    } catch (mailError) {
      // Sécurité : Si le serveur de mail crash, on ne veut pas bloquer l'inscription en base !
      this.logger.warn(
        `L'inscription ${registration.id} a réussi mais le mail n'a pas pu partir : ${
          mailError instanceof Error ? mailError.message : "Unknown error"
        }`,
      );
    }

    return {
      message: "Inscription gratuite réussie et mail de confirmation envoyé",
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
