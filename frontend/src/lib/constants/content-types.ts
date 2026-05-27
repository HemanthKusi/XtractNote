/**
 * Content type definitions for XtractNote.
 *
 * Each content type has its own color identity that's used throughout the UI:
 * - Quick action cards on the dashboard
 * - Chips and tags in history
 * - Progress bar during generation
 * - Editor toolbar accents
 * - Folder content type indicators
 */

export const CONTENT_TYPES = {
  blog: {
    label: "Blog post",
    color: "#3B7AE8",
    bgLight: "#EEF4FF",
    borderLight: "#C6DBFC",
    icon: "FileText",
    description: "SEO-friendly article with headings and sections",
    estimatedTime: "~5 min",
  },
  notes: {
    label: "Study notes",
    color: "#48903A",
    bgLight: "#F0F7EC",
    borderLight: "#C8E2B8",
    icon: "Notebook",
    description: "Notability-style with highlights and key points",
    estimatedTime: "~3 min",
  },
  summary: {
    label: "Summary",
    color: "#D4880C",
    bgLight: "#FEF4E8",
    borderLight: "#F5DDB5",
    icon: "ListDetails",
    description: "Quick overview with key points and timestamps",
    estimatedTime: "~1 min",
  },
  research: {
    label: "Research",
    color: "#7E4CC5",
    bgLight: "#F5EEFD",
    borderLight: "#DBC9F7",
    icon: "Microscope",
    description: "Deep analysis with citations and evidence",
    estimatedTime: "~6 min",
  },
  flashcards: {
    label: "Flashcards",
    color: "#E06030",
    bgLight: "#FFF0EB",
    borderLight: "#FCCDB8",
    icon: "Cards",
    description: "Q&A cards for spaced repetition study",
    estimatedTime: "~4 min",
  },
  quiz: {
    label: "Quiz",
    color: "#D44060",
    bgLight: "#FEECEF",
    borderLight: "#F9C3CC",
    icon: "Checkbox",
    description: "Multiple choice questions to test knowledge",
    estimatedTime: "~4 min",
  },
  social: {
    label: "Social pack",
    color: "#1C8C86",
    bgLight: "#EBF5F5",
    borderLight: "#BAE0DF",
    icon: "Share",
    description: "LinkedIn, X, IG, YT description, newsletter",
    estimatedTime: "~4 min",
  },
} as const;

// TypeScript type derived from the object keys
export type ContentType = keyof typeof CONTENT_TYPES;

// Array of all content type keys (useful for mapping/iteration)
export const CONTENT_TYPE_KEYS = Object.keys(CONTENT_TYPES) as ContentType[];
