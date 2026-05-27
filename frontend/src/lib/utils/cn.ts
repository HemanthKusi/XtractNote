import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes intelligently.
 *
 * Uses clsx for conditional classes and tailwind-merge to handle
 * conflicting classes (e.g., "px-4 px-6" becomes "px-6").
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
