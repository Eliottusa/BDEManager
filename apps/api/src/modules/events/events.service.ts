import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus } from '@prisma/client'; 

@Injectable()
export class EventsService {
  // Équivalent du constructeur Java avec injection de dépendance
  constructor(private prisma: PrismaService) {}

  // --- GESTION EVENTS ---

  // Créer un nouvel event
  async createEvent(data: any) {
    return this.prisma.event.create({
      data: {
        ...data,
        statut: data.statut || EventStatus.BROUILLON, // Valeur par défaut
      },
    });
  }

  // Récupérer tous les events (findAll)
  async getAllEvents() {
    return this.prisma.event.findMany();
  }

  // Récupérer par ID
  async getEventById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      // Équivalent du orElseThrow(() -> new RuntimeException(...))
      throw new NotFoundException(`Événement avec l'ID ${id} introuvable`);
    }
    return event;
  }

  // Mise à jour du statut
  async updateStatus(id: number, status: EventStatus) {
    await this.getEventById(id); // Vérifie s'il existe d'abord
    
    return this.prisma.event.update({
      where: { id },
      data: { statut: status },
    });
  }

  // --- GESTION INSCRIPTIONS ---

  async registerUser(eventId: number, email: string) {
    // 1. Vérifier si l'event existe
    const event = await this.getEventById(eventId);

    // 2. Vérifier le statut
    if (event.statut !== EventStatus.OUVERT) {
      throw new BadRequestException("Inscriptions fermées pour cet événement");
    }

    // 3. Vérifier la capacité
    const currentRegistrations = await this.prisma.registration.count({
      where: { eventId },
    });

    if (currentRegistrations >= event.capaciteMax) {
      // On met à jour l'event en complet comme dans ton code Java
      await this.prisma.event.update({
        where: { id: eventId },
        data: { statut: EventStatus.COMPLET },
      });
      throw new BadRequestException("Event complet");
    }

    // 4. Créer l'inscription
    return this.prisma.registration.create({
      data: {
        eventId: eventId,
        utilisateurEmail: email,
      },
    });
  }

  async getUserRegistrations(email: string) {
    return this.prisma.registration.findMany({
      where: { utilisateurEmail: email },
    });
  }
}