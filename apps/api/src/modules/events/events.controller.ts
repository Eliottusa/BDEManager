import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseIntPipe,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { EventStatus } from "@prisma/client";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() createEventDto: any) {
    // On s'assure que la méthode existe dans le service (voir étape 2)
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

  @Post(":id/register")
  async register(@Param("id") id: string, @Body("userId") userId: string) {
    return this.eventsService.registerUser(id, userId);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string, // <-- On laisse en string, pas de ParseIntPipe !
    @Body("status") status: EventStatus,
  ) {
    return this.eventsService.updateStatus(id, status);
  }
}
