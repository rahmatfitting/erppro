import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ReelScript {
  hook: string;
  body: string;
  cta: string;
  caption: string;
}

export class AIService {
  static async generateScript(productTitle: string, price: string): Promise<ReelScript | null> {
    try {
      console.log(`[AI] Generating script for: ${productTitle}`);
      
      const prompt = `
        Buat script reels Instagram untuk promosi produk Shopee Affiliate.
        Produk: ${productTitle}
        Harga: ${price}
        
        Style: Cepat, Energetik, FOMO (Fear of Missing Out), Conversational.
        Durasi: Max 20 detik.
        
        Format JSON:
        {
          "hook": "Kalimat pembuka yang bikin orang berhenti scrolling",
          "body": "Penjelasan singkat kenapa barang ini keren",
          "cta": "Call to action untuk klik link di bio",
          "caption": "Caption IG lengkap dengan hashtag viral"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
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
