import { prisma } from '@/lib/prisma';

export interface WebSection {
  type: 'hero' | 'about' | 'services' | 'gallery' | 'contact' | 'testimonials';
  title: string;
  subtitle?: string;
  content?: any;
  cta?: { text: string; link: string };
}

export interface DemoWebsite {
  business_name: string;
  primary_color: string;
  sections: WebSection[];
}

export class WebsiteGenerator {
  static async generateDemo(businessId: string): Promise<DemoWebsite> {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new Error('Business not found');

    const category = business.category?.toLowerCase() || 'bisnis';
    
    // AI Content Generation (Simplified for now)
    const heroTitle = `${business.name} - Solusi ${category.charAt(0).toUpperCase() + category.slice(1)} Terbaik`;
    const heroSubtitle = `Melayani dengan hati dan kualitas terbaik di ${business.city || 'Indonesia'}. Bergabunglah dengan ratusan pelanggan puas kami.`;

    const sections: WebSection[] = [
      {
        type: 'hero',
        title: heroTitle,
        subtitle: heroSubtitle,
        cta: { text: 'Pesan Sekarang via WhatsApp', link: `https://wa.me/${business.phone?.replace(/\D/g, '') || ''}` }
      },
      {
        type: 'about',
        title: `Tentang ${business.name}`,
        subtitle: 'Dedikasi & Kualitas dalam Setiap Layanan',
        content: `Kami adalah penyedia layanan ${category} terkemuka. Dengan rating ${business.rating} bintang dari ${business.reviews} ulasan di Google Maps, kami berkomitmen memberikan pengalaman terbaik bagi Anda.`
      },
      {
        type: 'services',
        title: 'Layanan Kami',
        subtitle: 'Solusi Lengkap untuk Kebutuhan Anda',
        content: [
          { title: `Layanan ${category} Premium`, description: 'Kualitas terbaik dengan bahan pilihan.' },
          { title: 'Pesan Antar Cepat', description: 'Sampai tepat waktu di lokasi Anda.' },
          { title: 'Custom Order', description: 'Sesuaikan dengan kebutuhan spesifik Anda.' }
        ]
      },
      {
        type: 'testimonials',
        title: 'Apa Kata Mereka?',
        subtitle: 'Ulasan dari Pelanggan Setia Kami',
        content: [
          { name: 'Customer Puas', text: `Pelayanan di ${business.name} sangat luar biasa. Sangat direkomendasikan!` },
          { name: 'Pelanggan Tetap', text: `Rating ${business.rating} di Google Maps tidak bohong. Kualitas bintang 5!` }
        ]
      },
      {
        type: 'contact',
        title: 'Hubungi Kami',
        subtitle: 'Kami siap melayani Anda 24/7',
        content: {
          address: business.address,
          phone: business.phone,
          maps_url: business.maps_url
        }
      }
    ];

    const demo = {
      business_name: business.name,
      primary_color: '#4f46e5', // Indigo-600
      sections
    };

    // Save demo to database
    await prisma.business.update({
      where: { id: businessId },
      data: {
        audit_data: {
          ...(business.audit_data as any || {}),
          demo_website: demo
        }
      }
    });

    return demo;
  }
}
