import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('q') q: string) {
    if (!q) return [];
    return this.geoService.searchAddress(q);
  }
}
