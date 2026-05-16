import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { RegisterEventDto } from "./dto/register-event.dto";
import { UpdateEventStatusDto } from "./dto/update-event-status.dto";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.createEvent(createEventDto);
  }

  @Get()
  async findAll() {
    return this.eventsService.getAllEvents();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.eventsService.getEventById(id);
  }

  // --- NOUVELLE ROUTE : MODIFICATION D'UN EVENT (PATCH) ---
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto, // Utilisation du nouveau DTO ici
  ) {
    return this.eventsService.updateEvent(id, updateEventDto);
  }

  // --- NOUVELLE ROUTE : SUPPRESSION D'UN EVENT (DELETE) ---
  @Delete(":id")
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

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, updateStatusDto.status);
  }
}
