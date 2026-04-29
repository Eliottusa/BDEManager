import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventStatus, RegistrationStatus } from "@prisma/client";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

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
    // 1. Vérifier si l'event existe
    const event = await this.getEventById(eventId);

    // 2. Vérifier le status (Attention : ton collègue utilise l'anglais)
    if (event.status !== EventStatus.OUVERT) {
      throw new BadRequestException("Inscriptions fermées pour cet événement");
    }

    // 3. Vérifier la capacité (le champ s'appelle 'capacity' chez ton pote)
    const currentRegistrations = await this.prisma.registration.count({
      where: { eventId },
    });

    if (currentRegistrations >= event.capacity) {
      // On met à jour le statut en COMPLET
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.COMPLET },
      });
      throw new BadRequestException("L'événement est désormais complet");
    }

    // 4. Créer l'inscription (Ici on utilise userId, car c'est une relation vers User)
    return this.prisma.registration.create({
      data: {
        eventId: eventId,
        userId: userId,
        status: RegistrationStatus.PENDING, // Valeur par défaut du schéma
      },
    });
  }

  async getUserRegistrations(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
      include: { event: true }, // Pour voir les détails de l'event associé
    });
  }
}
