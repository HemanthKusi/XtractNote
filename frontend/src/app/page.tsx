"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FormatCards } from "@/components/landing/format-cards";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OutputPreview } from "@/components/landing/output-preview";
import { ExtensionSection } from "@/components/landing/extension-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

// ────────────────────────────────────────────────────────────
// Landing Page
//
// The public marketing page at the root route (/).
// Uses its own Navbar — NOT the AppShell.
//
// All sections built across Phase 4:
//   Session 1: Navbar + HeroSection              ✅
//   Session 2: FormatCards + HowItWorks           ✅
//   Session 3: OutputPreview + ExtensionSection    ✅
//   Session 4: CTASection + Footer                ✅
//
// Phase 4 complete. Next: mobile layout pass, then Phase 5.
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-xn-bg">
      <Navbar />
      <HeroSection />
      <FormatCards />
      <HowItWorks />
      <OutputPreview />
      <ExtensionSection />
      <CTASection />
      <Footer />
    </div>
  );
}