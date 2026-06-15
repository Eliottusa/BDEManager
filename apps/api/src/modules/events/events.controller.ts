import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateEventStatusDto } from "./dto/update-event-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Réservé aux gestionnaires : création d'événement
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.createEvent(createEventDto);
  }

  @Get()
  async findAll() {
    return this.eventsService.getAllEvents();
  }

  // Inscriptions de l'utilisateur CONNECTÉ. L'identité vient du JWT, jamais du
  // client (sinon n'importe qui lirait les inscriptions d'autrui — IDOR).
  @Get("my-registrations")
  @UseGuards(JwtAuthGuard)
  async findMyRegistrations(@CurrentUser("id") userId: string) {
    return this.eventsService.getUserRegistrations(userId);
  }

  // Liste de gestion (tous les events) — réservée aux gestionnaires.
  // Déclarée AVANT @Get(":id") pour ne pas être capturée par la route param.
  @Get("manage")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async findAllForManagement() {
    return this.eventsService.getManageableEvents();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.eventsService.getEventById(id);
  }

  // Liste des inscrits d'un événement - réservée aux org/admin.
  // (Données personnelles : ne doit jamais être public.)
  @Get(":id/registrations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async findRegistrations(@Param("id") id: string) {
    return this.eventsService.getEventRegistrations(id);
  }

  // --- MODIFICATION D'UN EVENT (PATCH) — réservé aux gestionnaires ---
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto, // Utilisation du nouveau DTO ici
  ) {
    return this.eventsService.updateEvent(id, updateEventDto);
  }

  // --- SUPPRESSION D'UN EVENT (DELETE) — réservé aux gestionnaires ---
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async remove(@Param("id") id: string) {
    return this.eventsService.deleteEvent(id);
  }

  // Inscription à un événement pour l'utilisateur CONNECTÉ. L'identité vient du
  // JWT : impossible d'inscrire quelqu'un d'autre ni de s'inscrire anonymement.
  @Post(":id/register")
  @UseGuards(JwtAuthGuard)
  async register(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.eventsService.registerUser(id, userId);
  }

  // Changement de statut (ouvrir/fermer/etc.) — réservé aux gestionnaires
  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, updateStatusDto.status);
  }
}
