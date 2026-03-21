import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { MobileApp } from "@/components/landing/mobile-app";
import { WhatsApp } from "@/components/landing/whatsapp";
import { Desktop } from "@/components/landing/desktop";
import { Subscribe } from "@/components/landing/subscribe";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <MobileApp />
      <WhatsApp />
      <Desktop />
      <Subscribe />
      <Footer />
    </>
  );
}
