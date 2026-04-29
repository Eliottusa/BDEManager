import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q) return [];
    return this.geoService.searchAddress(q);
  }
}
