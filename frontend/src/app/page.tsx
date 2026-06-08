"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FormatCards } from "@/components/landing/format-cards";
import { HowItWorks } from "@/components/landing/how-it-works";

// ────────────────────────────────────────────────────────────
// Landing Page
//
// The public marketing page at the root route (/).
// Uses its own Navbar — NOT the AppShell.
//
// Sections are added incrementally across Phase 4 sessions:
//   Session 1: Navbar + HeroSection              ✅ done
//   Session 2: FormatCards + HowItWorks           ✅ this session
//   Session 3: OutputPreview + ExtensionSection
//   Session 4: CTASection + Footer
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <HeroSection />
      <FormatCards />
      <HowItWorks />

      {/* ── Remaining sections (coming in Sessions 3–4) ── */}
      {/* <OutputPreview /> */}
      {/* <ExtensionSection /> */}
      {/* <CTASection /> */}
      {/* <Footer /> */}
    </div>
  );
}