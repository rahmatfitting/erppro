export interface OutreachMessage {
  type: 'opening' | 'follow_up' | 'offer';
  content: string;
}

export class OutreachService {
  static generateMessages(business: any): OutreachMessage[] {
    const name = business.name;
    const category = business.category || 'bisnis';
    const city = business.city || '';

    const messages: OutreachMessage[] = [
      {
        type: 'opening',
        content: `Halo kak, saya lihat bisnis ${category}nya (${name}) punya review bagus banget di Google Maps (Rating ${business.rating}). Keren kak! Saya mau menawarkan kerjasama untuk bantu bikin website profesional agar orderannya makin lancar. Apakah kakak tertarik?`
      },
      {
        type: 'follow_up',
        content: `Halo Pak/Bu dari ${name}, saya yang kemarin sempat mention soal website. Apakah sudah sempat lihat contoh demo website yang saya buatkan khusus untuk bisnis Anda? Customer pasti lebih mudah order online kalau ada websitenya. Bagaimana menurut Anda?`
      },
      {
        type: 'offer',
        content: `Halo! Kami sedang ada promo khusus untuk pembuatan Company Profile premium bagi bisnis di ${city}. Untuk ${name}, kami berikan diskon 50% + bonus optimasi Google Maps agar makin sering muncul di urutan atas. Kabari ya kak kalau mau ambil promonya!`
      }
    ];

    return messages;
  }
}
