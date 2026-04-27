import { Controller } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // GET    /api/v1/events          — liste paginée
  // GET    /api/v1/events/:id      — détail
  // POST   /api/v1/events          — créer (ORGANIZER/ADMIN)
  // PATCH  /api/v1/events/:id      — modifier (ORGANIZER/ADMIN)
  // DELETE /api/v1/events/:id      — supprimer (ADMIN)
  // POST   /api/v1/events/:id/register — s'inscrire à un événement
}
