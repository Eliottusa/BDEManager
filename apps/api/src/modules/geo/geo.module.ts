import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [ConfigModule],
  controllers: [GeoController],
  providers: [GeoService],
})
export class GeoModule {}
