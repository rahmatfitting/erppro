

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  website?: string;
  formatted_phone_number?: string;
  url?: string; // Google Maps URL
}

export class GoogleMapsService {
  private static BASE_URL = 'https://maps.googleapis.com/maps/api/place';

  static async searchPlaces(query: string, location?: string): Promise<GooglePlace[]> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('GOOGLE_MAPS_API_KEY is not set');
      return [];
    }

    try {
      const fullQuery = location ? `${query} in ${location}` : query;
      const url = new URL(`${this.BASE_URL}/textsearch/json`);
      url.searchParams.append('query', fullQuery);
      url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API Error: ${data.status} - ${data.error_message || ''}`);
      }

      return data.results.map((result: any) => ({
        place_id: result.place_id,
        name: result.name,
        formatted_address: result.formatted_address,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
        types: result.types,
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  }

  static async getPlaceDetails(placeId: string): Promise<Partial<GooglePlace>> {
    if (!GOOGLE_MAPS_API_KEY) return {};

    try {
      const url = new URL(`${this.BASE_URL}/details/json`);
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('fields', 'name,rating,user_ratings_total,formatted_phone_number,website,url,formatted_address,types');
      url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API Error: ${data.status}`);
      }

      const result = data.result;
      return {
        name: result.name,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
        formatted_phone_number: result.formatted_phone_number,
        website: result.website,
        url: result.url,
        formatted_address: result.formatted_address,
        types: result.types,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      return {};
    }
  }
}
