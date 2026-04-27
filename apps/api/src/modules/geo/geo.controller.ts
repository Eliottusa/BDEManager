import { Controller } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  // GET /api/v1/geo/search?q=<adresse> — autocomplétion d'adresse (proxy vers data.gouv.fr)
}
