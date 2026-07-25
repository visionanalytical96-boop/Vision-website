import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BackToTop } from '@/components/layout/BackToTop';
import { Hero } from '@/components/home/Hero';
import { OffersSection } from '@/components/home/OffersSection';
import { DestinationsSection } from '@/components/home/DestinationsSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { PackagesSection } from '@/components/home/PackagesSection';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { AppPromoSection } from '@/components/home/AppPromoSection';
import { NewsletterSection } from '@/components/home/NewsletterSection';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <Hero />
        <OffersSection />
        <DestinationsSection />
        <CategoriesSection />
        <PackagesSection />
        <WhyChooseUs />
        <TestimonialsSection />
        <AppPromoSection />
        <NewsletterSection />
      </main>
      <Footer />
      <MobileBottomNav />
      <BackToTop />
    </>
  );
}
