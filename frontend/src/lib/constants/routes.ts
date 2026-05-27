/**
 * Route path constants for XtractNote.
 *
 * Using constants instead of hardcoded strings means:
 * - If a route changes, we update it in one place
 * - TypeScript autocomplete shows available routes
 * - Typos are caught at compile time
 */

export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Authenticated
  DASHBOARD: "/dashboard",
  CREATE: "/create",
  CREATE_SELECT: "/create/select",
  CREATE_PROGRESS: "/create/progress",
  HISTORY: "/history",
  FOLDERS: "/folders",
  SETTINGS: "/settings",

  // Dynamic routes (functions that take an ID parameter)
  output: (id: string) => `/output/${id}` as const,
  folder: (id: string) => `/folders/${id}` as const,
} as const;
