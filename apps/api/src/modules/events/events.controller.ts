import { Controller, Get, Post, Body, Param, Patch, ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventStatus } from '@prisma/client';

@Controller('events') // Équivalent de @RequestMapping("/events")
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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe convertit le string de l'URL en number, comme un @PathVariable
    return this.eventsService.getEventById(id);
  }

  @Post(':id/register')
  async register(
    @Param('id', ParseIntPipe) id: number,
    @Body('email') email: string,
  ) {
    return this.eventsService.registerUser(id, email);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: EventStatus,
  ) {
    return this.eventsService.updateStatus(id, status);
  }
}