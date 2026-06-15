import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { RegisterEventDto } from "./dto/register-event.dto";
import { UpdateEventStatusDto } from "./dto/update-event-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

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

  @Get("my-registrations")
  async findMyRegistrations(@Query("userId") userId: string) {
    return this.eventsService.getUserRegistrations(userId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.eventsService.getEventById(id);
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

  @Post(":id/register")
  async register(
    @Param("id") id: string,
    @Body() registerDto: RegisterEventDto,
  ) {
    return this.eventsService.registerUser(id, registerDto.userId);
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
