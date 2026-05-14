import { GoogleMapsService } from './google-maps';
import { prisma } from '@/lib/prisma';
import { ScoringService } from '@/ai/scoring';

export class AutomationService {
  static async runDailyScan(niche: string, city: string) {
    console.log(`Starting automated scan for ${niche} in ${city}...`);
    
    try {
      // 1. Search
      const places = await GoogleMapsService.searchPlaces(niche, city);
      
      let newLeadsCount = 0;

      for (const place of places) {
        // 2. Check if already exists
        const exists = await prisma.business.findUnique({ where: { place_id: place.place_id } });
        if (exists) continue;

        // 3. Get details
        const details = await GoogleMapsService.getPlaceDetails(place.place_id);
        
        // 4. Basic filtering (Rule: no website, good rating)
        if (!details.website && (details.rating || 0) >= 4) {
          const leadData = {
            place_id: place.place_id,
            name: place.name,
            category: niche,
            city: city,
            rating: details.rating || 0,
            reviews: details.user_ratings_total || 0,
            website: null,
            phone: details.formatted_phone_number || null,
            address: details.formatted_address || '',
            maps_url: details.url || '',
          };

          // 5. Score
          const score = ScoringService.calculateRuleScore(leadData);

          // 6. Save
          await prisma.business.create({
            data: {
              ...leadData,
              hot_score: score,
              status: 'new'
            }
          });

          newLeadsCount++;
        }
      }

      return {
        success: true,
        message: `Automation finished. Found and saved ${newLeadsCount} new high-potential leads.`
      };
    } catch (error: any) {
      console.error('Automation Error:', error);
      return { success: false, error: error.message };
    }
  }
}
