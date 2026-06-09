"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FormatCards } from "@/components/landing/format-cards";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OutputPreview } from "@/components/landing/output-preview";
import { ExtensionSection } from "@/components/landing/extension-section";

// ────────────────────────────────────────────────────────────
// Landing Page
//
// The public marketing page at the root route (/).
// Uses its own Navbar — NOT the AppShell.
//
// Sections are added incrementally across Phase 4 sessions:
//   Session 1: Navbar + HeroSection              ✅ done
//   Session 2: FormatCards + HowItWorks           ✅ done
//   Session 3: OutputPreview + ExtensionSection    ✅ this session
//   Session 4: CTASection + Footer
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-xn-bg">
      <Navbar />
      <HeroSection />
      <FormatCards />
      <HowItWorks />
      <OutputPreview />
      <ExtensionSection />

      {/* ── Remaining sections (coming in Session 4) ── */}
      {/* <CTASection /> */}
      {/* <Footer /> */}
    </div>
  );
}