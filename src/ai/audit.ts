import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AuditService {
  static async generateAudit(lead: any) {
    const prompt = `
      Anda adalah konsultan digital marketing dan web developer ahli.
      Analisis prospek bisnis berikut dari Google Maps dan buatkan Audit Kehadiran Digital yang profesional dalam BAHASA INDONESIA yang baik dan benar.
      
      Info Bisnis:
      - Nama: ${lead.name}
      - Kategori: ${lead.category}
      - Rating: ${lead.rating} (${lead.reviews} reviews)
      - Website: ${lead.website || 'TIDAK ADA'}
      - Telepon: ${lead.phone || 'TIDAK ADA'}
      - Alamat: ${lead.address}
      
      Tugas:
      1. Analisis kehadiran digital mereka saat ini (terutama jika mereka tidak punya website padahal review bagus).
      2. Identifikasi 3 masalah utama (pain points) yang kemungkinan besar mereka hadapi.
      3. Usulkan solusi website yang paling bermanfaat bagi mereka.
      4. Buat "Hot Pitch" - pesan WhatsApp singkat yang persuasif untuk menawarkan jasa pembuatan website. Gunakan bahasa yang sopan namun menarik.
      
      Kembalikan respons dalam format JSON:
      {
        "digital_score": number (1-100),
        "analysis": "string (dalam bahasa Indonesia)",
        "pain_points": ["string", "string", "string"] (dalam bahasa Indonesia),
        "solution": "string (dalam bahasa Indonesia)",
        "whatsapp_pitch": "string (dalam bahasa Indonesia)"
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Anda adalah auditor bisnis profesional. Berikan respons hanya dalam format JSON yang valid dan gunakan Bahasa Indonesia." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("AI failed to generate audit");
    
    return JSON.parse(content);
  }
}
