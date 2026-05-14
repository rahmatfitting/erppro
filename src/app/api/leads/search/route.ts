import { NextResponse } from 'next/server';
import { GoogleMapsService } from '@/services/google-maps';
import { CrawleeScraperService } from '@/services/crawlee-scraper';
import { prisma } from '@/lib/prisma';
import { ScoringService } from '@/ai/scoring';

export async function POST(request: Request) {
  try {
    const { 
      keyword, 
      location, 
      minRating = 4, 
      minReviews = 100, 
      filterNoWebsite = true,
      engine = 'google' 
    } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    let detailedLeads = [];

    if (engine === 'crawlee') {
      // ENGINE 2: Crawlee Scraper (Deep Scan)
      detailedLeads = await CrawleeScraperService.scrapeGoogleMaps(keyword, location, 10);
    } else {
      // ENGINE 1: Google Maps API (Standard)
      // 1. Search for places (Basic Search - cheaper)
      const basicPlaces = await GoogleMapsService.searchPlaces(keyword, location);
      
      // 2. Initial Filter
      const potentialLeads = basicPlaces.filter(place => {
        const rating = place.rating || 0;
        const reviews = place.user_ratings_total || 0;
        return rating >= minRating && reviews >= minReviews;
      });

      // 3. Get details for each potential lead
      const topPotentialLeads = potentialLeads.slice(0, 10);

      for (const place of topPotentialLeads) {
        const details = await GoogleMapsService.getPlaceDetails(place.place_id);
        
        const lead = {
          place_id: place.place_id,
          name: place.name,
          category: (details.types && details.types[0]) || '',
          city: location || '',
          rating: details.rating || place.rating || 0,
          reviews: details.user_ratings_total || place.user_ratings_total || 0,
          website: details.website || null,
          phone: details.formatted_phone_number || null,
          address: details.formatted_address || place.formatted_address,
          maps_url: details.url || null,
        };

        detailedLeads.push(lead);
      }
    }

    // Common Logic: Secondary Filter & Save to Database
    const finalLeads = [];
    for (const lead of detailedLeads) {
      // Filter out those that already have a website (if requested)
      if (filterNoWebsite && lead.website) {
        continue;
      }

      // Calculate initial HOT score
      const initialScore = ScoringService.calculateRuleScore(lead);
      
      const saved = await prisma.business.upsert({
        where: { place_id: lead.place_id },
        update: {
          ...lead,
          hot_score: initialScore,
          updated_at: new Date(),
        },
        create: {
          ...lead,
          hot_score: initialScore,
        },
      });
      finalLeads.push(saved);
    }

    return NextResponse.json({ 
      message: `Successfully processed ${finalLeads.length} leads using ${engine} engine.`,
      leads: finalLeads 
    });

  } catch (error: any) {
    console.error('Lead Search Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
