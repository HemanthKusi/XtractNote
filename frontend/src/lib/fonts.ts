// src/lib/fonts.ts
//
// Every typeface the product can set text in, declared once.
//
// ── Why a registry rather than imports where they are used ──
//
// A family named in a component is a family nothing else can find. Landing
// pages, headers, footers and the editor's font control all want the same set,
// and a picker needs to ENUMERATE it — which means the list has to be data, not
// a pile of imports scattered across the files that happen to use them.
//
// ── PRELOADING IS THE WHOLE GAME HERE ──
//
// `next/font` preloads by default, and preloading thirty families would put
// thirty font requests in the critical path of every page. Nobody would connect
// the slowdown back to this file.
//
// So exactly three families preload: the sans, serif and mono the base design
// actually uses on first paint. Everything else is declared with
// `preload: false`, which still self-hosts the file and still defines the CSS
// variable — the browser simply does not fetch it until something applies it.
// A face used on one landing page costs nothing on every other page.
//
// ── Licensing ──
//
// Every family here comes through `next/font/google`, and that catalogue
// accepts only open licences — OFL, Apache 2.0 and UFL. There is no per-family
// question to answer, which is exactly why these are the ones that land first.
// Families that need their files committed carry their own licence and are
// handled separately.

import localFont from "next/font/local";
import {
  Alex_Brush,
  Anonymous_Pro,
  Anton,
  Anybody,
  Archivo,
  Asap,
  Atkinson_Hyperlegible,
  Azeret_Mono,
  Barriecito,
  Be_Vietnam_Pro,
  Bebas_Neue,
  Cinzel,
  Crimson_Pro,
  DM_Sans,
  Dancing_Script,
  Epilogue,
  Familjen_Grotesk,
  Fira_Mono,
  Fira_Sans,
  Gluten,
  Grandstander,
  Hind,
  Inconsolata,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Kalam,
  Karma,
  Kaushan_Script,
  Khand,
  League_Gothic,
  Linden_Hill,
  Literata,
  Lora,
  Major_Mono_Display,
  Manrope,
  Martian_Mono,
  Merriweather_Sans,
  Montserrat,
  Neuton,
  Nunito,
  Oi,
  Open_Sans,
  Oswald,
  Outfit,
  PT_Mono,
  Plus_Jakarta_Sans,
  Poppins,
  Prociono,
  Public_Sans,
  Quicksand,
  Rajdhani,
  Rakkas,
  Red_Hat_Display,
  Rokkitt,
  Sora,
  Space_Grotesk,
  Spline_Sans,
  Teko,
  Work_Sans,
  Yatra_One,
} from "next/font/google";

/**
 * What a face is FOR, which is what a picker groups by.
 *
 * Deliberately coarser than a type foundry's categories: someone choosing a
 * font is asking "do I want this to read, or to shout", and five buckets answer
 * that. `script` covers handwriting and brush faces both — the distinction
 * between them matters to a typographer and not to the person picking one.
 */
export type FaceCategory = "sans" | "serif" | "mono" | "display" | "script";

export interface Face {
  /** Stable, url-safe, and what markup carries: `data-font="alex-brush"`. */
  id: string;
  /** What a person reads in a picker. */
  name: string;
  category: FaceCategory;
  /** The custom property to set `font-family` from. */
  cssVar: string;
  /** Where the family ends and the system takes over. */
  fallback: string;
  /**
   * next/font's generated class. It DEFINES the custom property rather than
   * applying the font, so it belongs on `<html>` once and nowhere else.
   */
  varClass: string;
  /** True only for the three the base design paints with on first load. */
  preloaded: boolean;
}

const SANS = "system-ui, sans-serif";
const SERIF = "Georgia, serif";
const MONO = "ui-monospace, Menlo, monospace";
const DISPLAY = "system-ui, sans-serif";
const SCRIPT = "cursive";

// ── The three the base design uses, and the only three that preload ──

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// ── Everything else: self-hosted, variable defined, file not fetched ──
//
// ── The options are repeated on every line, and they have to be ──
//
// `next/font` is a COMPILE-TIME transform, not a function call: it reads the
// argument out of the source to know what to download, so the argument must be
// an object literal. A shared `{ ...defaults }` spread typechecks perfectly and
// then fails the build with "Unexpected spread" — `tsc` has no idea this is not
// an ordinary call. Three repeated properties are the price of that.

const alexBrush = Alex_Brush({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-alex-brush", weight: "400" });
const anonymousPro = Anonymous_Pro({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-anonymous-pro", weight: ["400", "700"] });
const anton = Anton({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-anton", weight: "400" });
const anybody = Anybody({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-anybody" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-archivo" });
const asap = Asap({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-asap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-atkinson", weight: ["400", "700"] });
const azeretMono = Azeret_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-azeret-mono" });
const barriecito = Barriecito({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-barriecito", weight: "400" });
const beVietnamPro = Be_Vietnam_Pro({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-be-vietnam-pro", weight: ["400", "700"] });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bebas-neue", weight: "400" });
const cinzel = Cinzel({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cinzel" });
const crimsonPro = Crimson_Pro({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-crimson-pro" });
const dancingScript = Dancing_Script({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dancing-script" });
const epilogue = Epilogue({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-epilogue" });
const familjenGrotesk = Familjen_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-familjen-grotesk" });
const firaMono = Fira_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fira-mono", weight: ["400", "700"] });
const firaSans = Fira_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fira-sans", weight: ["400", "700"] });
const gluten = Gluten({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-gluten" });
const grandstander = Grandstander({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-grandstander" });
const hind = Hind({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-hind", weight: ["400", "700"] });
const inconsolata = Inconsolata({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inconsolata" });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const kalam = Kalam({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-kalam", weight: ["400", "700"] });
const karma = Karma({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-karma", weight: ["400", "700"] });
const kaushanScript = Kaushan_Script({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-kaushan-script", weight: "400" });
const khand = Khand({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-khand", weight: ["400", "700"] });
const leagueGothic = League_Gothic({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-league-gothic" });
const lindenHill = Linden_Hill({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-linden-hill", weight: "400", style: ["normal", "italic"] });
const literata = Literata({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-literata" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const majorMono = Major_Mono_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-major-mono", weight: "400" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const martianMono = Martian_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-martian-mono" });
const merriweatherSans = Merriweather_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-merriweather-sans" });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat" });
const neuton = Neuton({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-neuton", weight: ["300", "400", "700"] });
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito" });
const oi = Oi({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-oi", weight: "400" });
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-open-sans" });
const oswald = Oswald({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-oswald" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" });
const ptMono = PT_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-pt-mono", weight: "400" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plus-jakarta-sans" });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-poppins", weight: ["400", "700"] });
const prociono = Prociono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-prociono", weight: "400" });
const publicSans = Public_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-public-sans" });
const quicksand = Quicksand({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-quicksand" });
const rajdhani = Rajdhani({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-rajdhani", weight: ["400", "700"] });
const rakkas = Rakkas({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-rakkas", weight: "400" });
const redHatDisplay = Red_Hat_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-red-hat-display" });
const rokkitt = Rokkitt({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-rokkitt" });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-sora" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk" });
const splineSans = Spline_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-spline-sans" });
const teko = Teko({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-teko" });
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-work-sans" });
const yatraOne = Yatra_One({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-yatra-one", weight: "400" });

// ── Families whose files live in this repo ─────────────────
//
// These are not on Google Fonts, so `next/font/local` reads the file from
// `src/fonts/<family>/` instead of downloading one. Everything else is the
// same: self-hosted, a CSS variable, and no preload.
//
// ── Each family ships its licence beside its files ──
//
// `src/fonts/<family>/LICENSE.txt` is not decoration. The SIL OFL REQUIRES the
// licence to travel with the font, so a family without one is a family that
// cannot ship — and cannot sit in this directory either. Committing a font
// file publishes it whether or not anything imports it, so leaving an
// unlicensed one here unused is still distributing it. Outward was removed for
// exactly that: its files came from a webfont on the foundry's own page, and
// no repository carries its licence text.
//
// One file per family, deliberately. These are display and text faces for
// landing pages and the editor's picker, not a type system — a second weight
// gets added when something actually needs it.

const bagnard = localFont({ src: "../fonts/bagnard/Bagnard.otf", variable: "--font-bagnard", display: "swap", preload: false });
const blackout = localFont({ src: "../fonts/blackout/Blackout Midnight.ttf", variable: "--font-blackout", display: "swap", preload: false });
const bluuNext = localFont({ src: "../fonts/bluu-next/BluuNext-Titling.otf", variable: "--font-bluu-next", display: "swap", preload: false });
const chunk = localFont({ src: "../fonts/chunk/ChunkFive-Regular.otf", variable: "--font-chunk", display: "swap", preload: false });
const commitMono = localFont({ src: "../fonts/commit-mono/CommitMonoV143-250Regular.otf", variable: "--font-commit-mono", display: "swap", preload: false });
const facade = localFont({ src: "../fonts/facade/facade-est.woff2", variable: "--font-facade", display: "swap", preload: false });
const gtl001 = localFont({ src: "../fonts/gtl001/GTL001-Regular.ttf", variable: "--font-gtl001", display: "swap", preload: false });
const hasubiMono = localFont({ src: "../fonts/gtl001/HasubiMono-Regular.ttf", variable: "--font-hasubi-mono", display: "swap", preload: false });
const departureMono = localFont({ src: "../fonts/departure-mono/DepartureMono-Regular.woff2", variable: "--font-departure-mono", display: "swap", preload: false });
const lctMogi = localFont({ src: "../fonts/lct-mogi/LCMogi-A.otf", variable: "--font-lct-mogi", display: "swap", preload: false });
const apfelGrotezk = localFont({ src: "../fonts/apfel-grotezk/ApfelGrotezk-Regular.woff2", variable: "--font-apfel-grotezk", display: "swap", preload: false });
const sprat = localFont({ src: "../fonts/sprat/Sprat-Regular.woff2", variable: "--font-sprat", display: "swap", preload: false });
const manosque = localFont({ src: "../fonts/manosque/Manosque-Regular.woff2", variable: "--font-manosque", display: "swap", preload: false });
const struggle = localFont({ src: "../fonts/struggle/struggle-regular.woff2", variable: "--font-struggle", display: "swap", preload: false });
const haskoy = localFont({ src: "../fonts/haskoy/Haskoy-Regular.woff2", variable: "--font-haskoy", display: "swap", preload: false });
const karrik = localFont({ src: "../fonts/karrik/karrik-regular.woff2", variable: "--font-karrik", display: "swap", preload: false });
const murmure = localFont({ src: "../fonts/murmure/LeMurmure-Regular.woff2", variable: "--font-murmure", display: "swap", preload: false });
const ostrichSans = localFont({ src: "../fonts/ostrich-sans/OstrichSans-Medium.otf", variable: "--font-ostrich-sans", display: "swap", preload: false });
const roundo = localFont({ src: "../fonts/roundo/Roundo-Regular.otf", variable: "--font-roundo", display: "swap", preload: false });
const ouroboros = localFont({ src: "../fonts/ouroboros/ouroboros-regular.woff2", variable: "--font-ouroboros", display: "swap", preload: false });
const pilowlava = localFont({ src: "../fonts/pilowlava/pilowlava-regular.woff2", variable: "--font-pilowlava", display: "swap", preload: false });
const typefesse = localFont({ src: "../fonts/typefesse/Typefesse_Pleine.otf", variable: "--font-typefesse", display: "swap", preload: false });

/**
 * The catalogue, in picker order: the working families first, then the ones
 * chosen for character.
 */
export const FACES: Face[] = [
  { id: "dm-sans", name: "DM Sans", category: "sans", cssVar: "--font-dm-sans", fallback: SANS, varClass: dmSans.variable, preloaded: true },
  { id: "instrument-serif", name: "Instrument Serif", category: "serif", cssVar: "--font-instrument-serif", fallback: SERIF, varClass: instrumentSerif.variable, preloaded: true },
  { id: "jetbrains-mono", name: "JetBrains Mono", category: "mono", cssVar: "--font-jetbrains-mono", fallback: MONO, varClass: jetbrainsMono.variable, preloaded: true },

  { id: "inter", name: "Inter", category: "sans", cssVar: "--font-inter", fallback: SANS, varClass: inter.variable, preloaded: false },
  { id: "open-sans", name: "Open Sans", category: "sans", cssVar: "--font-open-sans", fallback: SANS, varClass: openSans.variable, preloaded: false },
  { id: "manrope", name: "Manrope", category: "sans", cssVar: "--font-manrope", fallback: SANS, varClass: manrope.variable, preloaded: false },
  { id: "work-sans", name: "Work Sans", category: "sans", cssVar: "--font-work-sans", fallback: SANS, varClass: workSans.variable, preloaded: false },
  { id: "space-grotesk", name: "Space Grotesk", category: "sans", cssVar: "--font-space-grotesk", fallback: SANS, varClass: spaceGrotesk.variable, preloaded: false },
  { id: "anybody", name: "Anybody", category: "sans", cssVar: "--font-anybody", fallback: SANS, varClass: anybody.variable, preloaded: false },
  { id: "archivo", name: "Archivo", category: "sans", cssVar: "--font-archivo", fallback: SANS, varClass: archivo.variable, preloaded: false },
  { id: "asap", name: "Asap", category: "sans", cssVar: "--font-asap", fallback: SANS, varClass: asap.variable, preloaded: false },
  { id: "be-vietnam-pro", name: "Be Vietnam Pro", category: "sans", cssVar: "--font-be-vietnam-pro", fallback: SANS, varClass: beVietnamPro.variable, preloaded: false },
  { id: "epilogue", name: "Epilogue", category: "sans", cssVar: "--font-epilogue", fallback: SANS, varClass: epilogue.variable, preloaded: false },
  { id: "familjen-grotesk", name: "Familjen Grotesk", category: "sans", cssVar: "--font-familjen-grotesk", fallback: SANS, varClass: familjenGrotesk.variable, preloaded: false },
  { id: "fira-sans", name: "Fira Sans", category: "sans", cssVar: "--font-fira-sans", fallback: SANS, varClass: firaSans.variable, preloaded: false },
  { id: "hind", name: "Hind", category: "sans", cssVar: "--font-hind", fallback: SANS, varClass: hind.variable, preloaded: false },
  { id: "khand", name: "Khand", category: "sans", cssVar: "--font-khand", fallback: SANS, varClass: khand.variable, preloaded: false },
  { id: "merriweather-sans", name: "Merriweather Sans", category: "sans", cssVar: "--font-merriweather-sans", fallback: SANS, varClass: merriweatherSans.variable, preloaded: false },
  { id: "montserrat", name: "Montserrat", category: "sans", cssVar: "--font-montserrat", fallback: SANS, varClass: montserrat.variable, preloaded: false },
  { id: "nunito", name: "Nunito", category: "sans", cssVar: "--font-nunito", fallback: SANS, varClass: nunito.variable, preloaded: false },
  { id: "outfit", name: "Outfit", category: "sans", cssVar: "--font-outfit", fallback: SANS, varClass: outfit.variable, preloaded: false },
  { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", category: "sans", cssVar: "--font-plus-jakarta-sans", fallback: SANS, varClass: plusJakartaSans.variable, preloaded: false },
  { id: "poppins", name: "Poppins", category: "sans", cssVar: "--font-poppins", fallback: SANS, varClass: poppins.variable, preloaded: false },
  { id: "public-sans", name: "Public Sans", category: "sans", cssVar: "--font-public-sans", fallback: SANS, varClass: publicSans.variable, preloaded: false },
  { id: "quicksand", name: "Quicksand", category: "sans", cssVar: "--font-quicksand", fallback: SANS, varClass: quicksand.variable, preloaded: false },
  { id: "rajdhani", name: "Rajdhani", category: "sans", cssVar: "--font-rajdhani", fallback: SANS, varClass: rajdhani.variable, preloaded: false },
  { id: "red-hat-display", name: "Red Hat Display", category: "sans", cssVar: "--font-red-hat-display", fallback: SANS, varClass: redHatDisplay.variable, preloaded: false },
  { id: "sora", name: "Sora", category: "sans", cssVar: "--font-sora", fallback: SANS, varClass: sora.variable, preloaded: false },
  { id: "spline-sans", name: "Spline Sans", category: "sans", cssVar: "--font-spline-sans", fallback: SANS, varClass: splineSans.variable, preloaded: false },
  { id: "teko", name: "Teko", category: "sans", cssVar: "--font-teko", fallback: SANS, varClass: teko.variable, preloaded: false },

  { id: "lora", name: "Lora", category: "serif", cssVar: "--font-lora", fallback: SERIF, varClass: lora.variable, preloaded: false },
  { id: "neuton", name: "Neuton", category: "serif", cssVar: "--font-neuton", fallback: SERIF, varClass: neuton.variable, preloaded: false },
  { id: "linden-hill", name: "Linden Hill", category: "serif", cssVar: "--font-linden-hill", fallback: SERIF, varClass: lindenHill.variable, preloaded: false },
  { id: "prociono", name: "Prociono", category: "serif", cssVar: "--font-prociono", fallback: SERIF, varClass: prociono.variable, preloaded: false },
  { id: "cinzel", name: "Cinzel", category: "serif", cssVar: "--font-cinzel", fallback: SERIF, varClass: cinzel.variable, preloaded: false },
  { id: "rokkitt", name: "Rokkitt", category: "serif", cssVar: "--font-rokkitt", fallback: SERIF, varClass: rokkitt.variable, preloaded: false },
  { id: "crimson-pro", name: "Crimson Pro", category: "serif", cssVar: "--font-crimson-pro", fallback: SERIF, varClass: crimsonPro.variable, preloaded: false },
  { id: "karma", name: "Karma", category: "serif", cssVar: "--font-karma", fallback: SERIF, varClass: karma.variable, preloaded: false },
  { id: "literata", name: "Literata", category: "serif", cssVar: "--font-literata", fallback: SERIF, varClass: literata.variable, preloaded: false },

  { id: "inconsolata", name: "Inconsolata", category: "mono", cssVar: "--font-inconsolata", fallback: MONO, varClass: inconsolata.variable, preloaded: false },
  { id: "fira-mono", name: "Fira Mono", category: "mono", cssVar: "--font-fira-mono", fallback: MONO, varClass: firaMono.variable, preloaded: false },
  { id: "pt-mono", name: "PT Mono", category: "mono", cssVar: "--font-pt-mono", fallback: MONO, varClass: ptMono.variable, preloaded: false },
  { id: "anonymous-pro", name: "Anonymous Pro", category: "mono", cssVar: "--font-anonymous-pro", fallback: MONO, varClass: anonymousPro.variable, preloaded: false },
  { id: "martian-mono", name: "Martian Mono", category: "mono", cssVar: "--font-martian-mono", fallback: MONO, varClass: martianMono.variable, preloaded: false },
  { id: "major-mono", name: "Major Mono Display", category: "mono", cssVar: "--font-major-mono", fallback: MONO, varClass: majorMono.variable, preloaded: false },
  { id: "azeret-mono", name: "Azeret Mono", category: "mono", cssVar: "--font-azeret-mono", fallback: MONO, varClass: azeretMono.variable, preloaded: false },

  { id: "oi", name: "Oi", category: "display", cssVar: "--font-oi", fallback: DISPLAY, varClass: oi.variable, preloaded: false },
  { id: "league-gothic", name: "League Gothic", category: "display", cssVar: "--font-league-gothic", fallback: DISPLAY, varClass: leagueGothic.variable, preloaded: false },
  { id: "rakkas", name: "Rakkas", category: "display", cssVar: "--font-rakkas", fallback: DISPLAY, varClass: rakkas.variable, preloaded: false },
  { id: "yatra-one", name: "Yatra One", category: "display", cssVar: "--font-yatra-one", fallback: DISPLAY, varClass: yatraOne.variable, preloaded: false },
  { id: "barriecito", name: "Barriecito", category: "display", cssVar: "--font-barriecito", fallback: DISPLAY, varClass: barriecito.variable, preloaded: false },
  { id: "grandstander", name: "Grandstander", category: "display", cssVar: "--font-grandstander", fallback: DISPLAY, varClass: grandstander.variable, preloaded: false },
  { id: "gluten", name: "Gluten", category: "display", cssVar: "--font-gluten", fallback: DISPLAY, varClass: gluten.variable, preloaded: false },
  { id: "anton", name: "Anton", category: "display", cssVar: "--font-anton", fallback: DISPLAY, varClass: anton.variable, preloaded: false },
  { id: "bebas-neue", name: "Bebas Neue", category: "display", cssVar: "--font-bebas-neue", fallback: DISPLAY, varClass: bebasNeue.variable, preloaded: false },
  { id: "oswald", name: "Oswald", category: "display", cssVar: "--font-oswald", fallback: DISPLAY, varClass: oswald.variable, preloaded: false },

  { id: "kaushan-script", name: "Kaushan Script", category: "script", cssVar: "--font-kaushan-script", fallback: SCRIPT, varClass: kaushanScript.variable, preloaded: false },
  { id: "alex-brush", name: "Alex Brush", category: "script", cssVar: "--font-alex-brush", fallback: SCRIPT, varClass: alexBrush.variable, preloaded: false },
  { id: "dancing-script", name: "Dancing Script", category: "script", cssVar: "--font-dancing-script", fallback: SCRIPT, varClass: dancingScript.variable, preloaded: false },
  { id: "kalam", name: "Kalam", category: "script", cssVar: "--font-kalam", fallback: SCRIPT, varClass: kalam.variable, preloaded: false },

  // ── Files in this repo, each beside its licence ──
  { id: "atkinson", name: "Atkinson Hyperlegible", category: "sans", cssVar: "--font-atkinson", fallback: SANS, varClass: atkinson.variable, preloaded: false },
  { id: "haskoy", name: "Hasköy", category: "sans", cssVar: "--font-haskoy", fallback: SANS, varClass: haskoy.variable, preloaded: false },
  { id: "apfel-grotezk", name: "Apfel Grotezk", category: "sans", cssVar: "--font-apfel-grotezk", fallback: SANS, varClass: apfelGrotezk.variable, preloaded: false },
  { id: "karrik", name: "Karrik", category: "sans", cssVar: "--font-karrik", fallback: SANS, varClass: karrik.variable, preloaded: false },
  { id: "ostrich-sans", name: "Ostrich Sans", category: "sans", cssVar: "--font-ostrich-sans", fallback: SANS, varClass: ostrichSans.variable, preloaded: false },
  { id: "roundo", name: "Roundo", category: "sans", cssVar: "--font-roundo", fallback: SANS, varClass: roundo.variable, preloaded: false },

  { id: "manosque", name: "Manosque", category: "serif", cssVar: "--font-manosque", fallback: SERIF, varClass: manosque.variable, preloaded: false },
  { id: "sprat", name: "Sprat", category: "serif", cssVar: "--font-sprat", fallback: SERIF, varClass: sprat.variable, preloaded: false },
  { id: "bagnard", name: "Bagnard", category: "serif", cssVar: "--font-bagnard", fallback: SERIF, varClass: bagnard.variable, preloaded: false },
  { id: "bluu-next", name: "Bluu Next", category: "serif", cssVar: "--font-bluu-next", fallback: SERIF, varClass: bluuNext.variable, preloaded: false },

  { id: "departure-mono", name: "Departure Mono", category: "mono", cssVar: "--font-departure-mono", fallback: MONO, varClass: departureMono.variable, preloaded: false },
  { id: "commit-mono", name: "Commit Mono", category: "mono", cssVar: "--font-commit-mono", fallback: MONO, varClass: commitMono.variable, preloaded: false },
  { id: "hasubi-mono", name: "Hasubi Mono", category: "mono", cssVar: "--font-hasubi-mono", fallback: MONO, varClass: hasubiMono.variable, preloaded: false },

  { id: "lct-mogi", name: "LCT Mogi", category: "display", cssVar: "--font-lct-mogi", fallback: DISPLAY, varClass: lctMogi.variable, preloaded: false },
  { id: "struggle", name: "Struggle", category: "display", cssVar: "--font-struggle", fallback: DISPLAY, varClass: struggle.variable, preloaded: false },
  { id: "chunk", name: "Chunk", category: "display", cssVar: "--font-chunk", fallback: DISPLAY, varClass: chunk.variable, preloaded: false },
  { id: "blackout", name: "Blackout", category: "display", cssVar: "--font-blackout", fallback: DISPLAY, varClass: blackout.variable, preloaded: false },
  { id: "facade", name: "Façade", category: "display", cssVar: "--font-facade", fallback: DISPLAY, varClass: facade.variable, preloaded: false },
  { id: "gtl001", name: "GTL001", category: "display", cssVar: "--font-gtl001", fallback: DISPLAY, varClass: gtl001.variable, preloaded: false },
  { id: "murmure", name: "Le Murmure", category: "display", cssVar: "--font-murmure", fallback: DISPLAY, varClass: murmure.variable, preloaded: false },
  { id: "ouroboros", name: "Ouroboros", category: "display", cssVar: "--font-ouroboros", fallback: DISPLAY, varClass: ouroboros.variable, preloaded: false },
  { id: "pilowlava", name: "Pilowlava", category: "display", cssVar: "--font-pilowlava", fallback: DISPLAY, varClass: pilowlava.variable, preloaded: false },
  { id: "typefesse", name: "Typefesse", category: "display", cssVar: "--font-typefesse", fallback: DISPLAY, varClass: typefesse.variable, preloaded: false },
];

/** Every variable-defining class, for `<html>`. The only correct consumer. */
export const FACE_VAR_CLASSES = FACES.map((f) => f.varClass).join(" ");

/** The `font-family` value for a face — the variable, then where to fall back. */
export const faceStack = (face: Face) => `var(${face.cssVar}), ${face.fallback}`;

/** Faces grouped for a picker, in the order declared above. */
export function facesByCategory(): { category: FaceCategory; faces: Face[] }[] {
  const order: FaceCategory[] = ["sans", "serif", "mono", "display", "script"];
  return order
    .map((category) => ({ category, faces: FACES.filter((f) => f.category === category) }))
    .filter((g) => g.faces.length > 0);
}
