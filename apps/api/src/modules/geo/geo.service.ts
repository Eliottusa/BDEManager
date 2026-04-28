import { Injectable } from '@nestjs/common';

export interface GeoResult {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

@Injectable()
export class GeoService {
  async searchAddress(q: string): Promise<GeoResult[]> {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`;
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
