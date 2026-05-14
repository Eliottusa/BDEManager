import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeoResult {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

@Injectable()
export class GeoService {
  constructor(private readonly config: ConfigService) {}

  async searchAddress(q: string): Promise<GeoResult[]> {
    const base = this.config.get('GEO_API_URL', 'https://api-adresse.data.gouv.fr');
    const url = `${base}/search/?q=${encodeURIComponent(q)}&limit=5`;
    const response = await fetch(url);
    const data = await response.json();

    return (data.features ?? []).map((feature: any) => ({
      label: feature.properties.label,
      city: feature.properties.city,
      postcode: feature.properties.postcode,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
    }));
  }
}
