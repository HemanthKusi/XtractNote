"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";

// ────────────────────────────────────────────────────────────
// Landing Page
//
// The public marketing page at the root route (/).
// Uses its own Navbar — NOT the AppShell.
//
// Sections are added incrementally across Phase 4 sessions:
//   Session 1: Navbar + HeroSection         ← this session
//   Session 2: FormatCards + HowItWorks
//   Session 3: OutputPreview + ExtensionSection
//   Session 4: CTASection + Footer
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <HeroSection />

      {/* ── Remaining sections (coming in Sessions 2–4) ── */}
      {/* <FormatCards /> */}
      {/* <HowItWorks /> */}
      {/* <OutputPreview /> */}
      {/* <ExtensionSection /> */}
      {/* <CTASection /> */}
      {/* <Footer /> */}
    </div>
  );
}