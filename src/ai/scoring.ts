import { prisma } from '@/lib/prisma';

export interface ScoringResult {
  score: number;
  recommendations: string[];
  hot_reason: string;
}

export class ScoringService {
  /**
   * Calculate HOT score based on rules engine
   */
  static calculateRuleScore(business: any): number {
    let score = 0;

    // +40 tidak punya website
    if (!business.website) score += 40;

    // +25 review > 300
    if (business.reviews > 300) score += 25;
    else if (business.reviews > 100) score += 15;

    // +20 rating > 4.5
    if (business.rating > 4.5) score += 20;
    else if (business.rating > 4.0) score += 10;

    // +10 banyak foto / maps ranking (placeholder logic)
    // Assuming if it's in the top results of our search, it has good ranking
    score += 10; 

    // Cap score at 100
    return Math.min(100, score);
  }

  /**
   * Generate AI recommendations using OpenAI (or fallback)
   */
  static async getAIRecommendations(business: any, score: number): Promise<ScoringResult> {
    const rulesScore = this.calculateRuleScore(business);
    const finalScore = Math.max(rulesScore, score);

    const recommendations = [];
    let hotReason = "";

    if (!business.website) {
      recommendations.push("Landing page profesional");
      recommendations.push("Online ordering system");
      hotReason = "Bisnis ini memiliki reputasi tinggi namun belum memiliki website profesional.";
    } else {
      recommendations.push("Redesign website modern");
      recommendations.push("Optimasi SEO Lokal");
      hotReason = "Bisnis sudah memiliki website, namun potensi optimasi masih besar.";
    }

    recommendations.push("Google Maps Optimization (GMB)");

    // In a real scenario, we would call OpenAI here
    // For now, returning structured data based on the prompt's examples
    
    return {
      score: finalScore,
      recommendations,
      hot_reason: hotReason
    };
  }

  static async updateBusinessScore(id: string) {
    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) return;

    const result = await this.getAIRecommendations(business, business.hot_score);
    
    await prisma.business.update({
      where: { id },
      data: {
        hot_score: result.score,
        ai_notes: result.hot_reason,
        audit_data: {
          recommendations: result.recommendations
        }
      }
    });

    return result;
  }
}
