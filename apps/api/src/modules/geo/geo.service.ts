import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoService {
  // TODO Eliott — searchAddress(q: string): appelle https://api-adresse.data.gouv.fr/search?q=<q>
  //   retourne: [{ label, housenumber, street, city, postcode, lat, lon }]
  //   Aucune clé API requise pour data.gouv.fr
}
