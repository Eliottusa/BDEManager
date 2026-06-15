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

    const isPaid = event.price > 0;

    // 2. Inscription déjà existante ? (contrainte unique userId + eventId)
    //    On ne crée jamais un second enregistrement : on reprend l'existant.
    const existing = await this.prisma.registration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existing) {
      // Déjà confirmée -> on bloque la double inscription.
      if (existing.status === RegistrationStatus.CONFIRMED) {
        throw new BadRequestException("Vous êtes déjà inscrit à cet événement");
      }
      // En attente -> on REPREND le flux existant au lieu d'en créer un autre.
      if (existing.status === RegistrationStatus.PENDING) {
        if (isPaid) {
          // Le service paiement retrouve la session Stripe encore valide
          // (ou en régénère une) -> reprise d'un paiement abandonné.
          return this.createPaymentSession(existing.id, eventId);
        }
        // cas improbable : gratuit resté PENDING
        const confirmed = await this.prisma.registration.update({
          where: { id: existing.id },
          data: { status: RegistrationStatus.CONFIRMED },
        });
        return { message: "Inscription confirmée", registration: confirmed };
      }
      // CANCELLED / WAITLISTED : on réactive cette ligne plus bas.
    }

    // 3. Vérification de capacité (places tenues par les inscriptions actives :
    //    on ne compte pas les inscriptions annulées).
    const activeRegistrations = await this.prisma.registration.count({
      where: {
        eventId,
        status: {
          in: [RegistrationStatus.PENDING, RegistrationStatus.CONFIRMED],
        },
      },
    });

    if (activeRegistrations >= event.capacity) {
      await this.updateStatus(eventId, EventStatus.COMPLET);
      throw new BadRequestException("L'événement est désormais complet");
    }

    // 4. Création (ou réactivation d'une inscription précédemment annulée).
    //    Event payant -> PENDING (confirmé plus tard par le webhook Stripe).
    //    Event gratuit -> CONFIRMED tout de suite.
    const targetStatus = isPaid
      ? RegistrationStatus.PENDING
      : RegistrationStatus.CONFIRMED;

    const registration = existing
      ? await this.prisma.registration.update({
          where: { id: existing.id },
          data: { status: targetStatus },
          include: { user: true },
        })
      : await this.prisma.registration.create({
          data: { eventId, userId, status: targetStatus },
          include: { user: true },
        });

    // 5. Si l'événement est payant, on génère la session Stripe.
    if (isPaid) {
      return this.createPaymentSession(registration.id, eventId);
    }

    // 6. Gratuit : mail de confirmation (non bloquant).
    try {
      await this.mailService.sendEventConfirmation(registration.user.email, {
        firstName: registration.user.firstName || "Étudiant",
        eventName: event.title,
        eventDate: event.startDate.toLocaleDateString("fr-FR"),
        eventLocation:
          event.addressLabel || event.addressCity || "Non spécifié",
        actionUrl: `http://localhost:3000/tickets/${registration.id}`,
      });
    } catch (mailError) {
      // Sécurité : si le serveur mail crash, on ne bloque pas l'inscription.
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

  // Génère (ou retrouve) la session Stripe Checkout pour une inscription payante.
  // createCheckoutSession réutilise une session PENDING encore valide.
  private async createPaymentSession(registrationId: string, eventId: string) {
    // URL publique du front (Caddy en prod, localhost en dev). Doit matcher
    // FRONTEND_URL (utilisé aussi pour le CORS) — pas de host en dur.
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    // L'app est localisée ([locale]) : on cible la locale par défaut.
    const locale = "fr";
    return this.paymentsService.createCheckoutSession({
      registrationId,
      // Stripe remplace {CHECKOUT_SESSION_ID} par l'id réel de la session.
      // La page /checkout/success lit ?session_id pour appeler /payments/verify.
      successUrl: `${frontendUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      // Pas de page d'annulation dédiée : retour sur la fiche de l'événement.
      cancelUrl: `${frontendUrl}/${locale}/events/${eventId}`,
    });
  }

  async getUserRegistrations(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
      include: { event: true }, // Pour voir les détails de l'event associé
    });
  }
}
