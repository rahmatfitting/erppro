import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ReelScript {
  script: string;
  caption: string;
}

export interface ProductData {
  title: string;
  price: string;
}

export class AIService {
  static async generateScript(product: ProductData, productUrl: string): Promise<ReelScript | null> {
    try {
      console.log(`[AI] Generating script for: ${product.title}`);
      
      const prompt = `
        You are an expert social media marketer and affiliate creator.
        Create a highly engaging Instagram Reel script and caption for this Shopee product:
        Title: ${product.title}
        Price: ${product.price}
        
        Requirements:
        1. Script: Catchy, short (max 15 seconds), focus on benefits. Use Indonesian (Gaul/Casual).
        2. Caption: Persuasive, include relevant emojis, and use these hashtags: #ShopeeFinds #FOMOBeliSekarang.
        3. Link: You MUST include this product link in the caption with a clear Call to Action (CTA): ${productUrl}
        
        Format the output as JSON:
        {
          "script": "the script text",
          "caption": "the caption text including the link ${productUrl}"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;

    } catch (error) {
      console.error(`[AI] Error generating script: ${error}`);
      return null;
    }
  }

  static async generateVoice(text: string, filename: string): Promise<string | null> {
    try {
      console.log(`[AI] Generating voice for script...`);
      
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx", // Suara berat & profesional
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const filePath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'processed', filename);
      
      await fs.promises.writeFile(filePath, buffer);
      console.log(`[AI] Voice generated at: ${filePath}`);
      
      return filePath;

    } catch (error) {
      console.error(`[AI] Error generating voice: ${error}`);
      return null;
    }
  }
}
