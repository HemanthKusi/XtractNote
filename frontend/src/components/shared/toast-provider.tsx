"use client";

// ─────────────────────────────────────────────────────────────
// Toast System
// ─────────────────────────────────────────────────────────────
// Complete notification system: provider + hook + rendering.
//
// Setup (in layout.tsx):
//   <ThemeProvider>
//     <ToastProvider>
//       {children}
//     </ToastProvider>
//   </ThemeProvider>
//
// Usage (in any component):
//   import { useToast } from "@/components/shared/toast-provider";
//
//   const toast = useToast();
//   toast.success("Content saved!");
//   toast.error("Could not fetch transcript.");
//   toast.info("Processing video...");
//   toast.warning("This video has no captions.");
//
// Toasts appear at the bottom-right, stack vertically,
// and auto-dismiss after 4 seconds (configurable).
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ── Toast Types ─────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  /** Unique identifier for this toast */
  id: string;
  /** Visual type — controls icon and accent color */
  type: ToastType;
  /** Main message text */
  message: string;
  /** Optional secondary description */
  description?: string;
  /** How long the toast stays visible (in milliseconds) */
  duration: number;
}

// Options when creating a toast
interface ToastOptions {
  description?: string;
  /** Duration in ms. Default: 4000 (4 seconds). */
  duration?: number;
}

// ── Toast Colors ────────────────────────────────────────────
// Each type gets a left-edge accent bar color and icon color.

const toastStyles: Record<ToastType, { accent: string; iconColor: string }> = {
  success: { accent: "#48903A", iconColor: "#48903A" },
  error:   { accent: "#D44060", iconColor: "#D44060" },
  info:    { accent: "#3B7AE8", iconColor: "#3B7AE8" },
  warning: { accent: "#D4880C", iconColor: "#D4880C" },
};

// ── Toast Icons ─────────────────────────────────────────────
// Small inline SVGs for each toast type.

const toastIcons: Record<ToastType, ReactNode> = {
  success: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

// ── Context ─────────────────────────────────────────────────
// The context provides the toast creation functions.

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ── ID Generator ────────────────────────────────────────────
// Simple incrementing ID. Each toast gets a unique number.
let toastIdCounter = 0;
function generateId(): string {
  toastIdCounter += 1;
  return `toast-${toastIdCounter}`;
}

// Default auto-dismiss duration
const DEFAULT_DURATION = 4000;

// ── Provider Component ──────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  // Array of currently visible toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // ── Add a toast ──
  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = generateId();
      const duration = options?.duration ?? DEFAULT_DURATION;

      const newToast: ToastItem = {
        id,
        type,
        message,
        description: options?.description,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  // ── Remove a toast by ID ──
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Create the convenience methods ──
  const contextValue: ToastContextValue = {
    success: useCallback(
      (msg: string, opts?: ToastOptions) => addToast("success", msg, opts),
      [addToast]
    ),
    error: useCallback(
      (msg: string, opts?: ToastOptions) => addToast("error", msg, opts),
      [addToast]
    ),
    info: useCallback(
      (msg: string, opts?: ToastOptions) => addToast("info", msg, opts),
      [addToast]
    ),
    warning: useCallback(
      (msg: string, opts?: ToastOptions) => addToast("warning", msg, opts),
      [addToast]
    ),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* ── Toast Container ──
          Fixed to the bottom-right of the viewport.
          Stacks toasts vertically with a gap.
          z-[100] ensures toasts appear above modals (z-50). */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ── Individual Toast Component ──────────────────────────────
// Renders a single toast notification with auto-dismiss timer.

function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  // ── Auto-dismiss timer ──
  // Start a timer when the toast appears. When it expires,
  // call onDismiss to remove it from the list.
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, toast.duration);

    // Cleanup: if the toast is manually dismissed before the timer
    // fires, clear the timer so it doesn't try to dismiss twice.
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration, onDismiss]);

  const style = toastStyles[toast.type];

  return (
    <div
      className={[
        // Layout
        "flex items-start gap-3",
        "w-80 p-3",
        // Visuals — matches Card surface styling
        "bg-xn-surface",
        "border border-xn-border",
        "rounded-xn-lg",
        "shadow-xn-lg",
        // Entrance animation
        "animate-slide-in-right",
        // Re-enable pointer events (container has pointer-events-none)
        "pointer-events-auto",
      ].join(" ")}
      role="alert"
    >
      {/* Colored accent bar on the left edge */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: style.accent }}
      />

      {/* Icon */}
      <span
        className="w-4 h-4 shrink-0 mt-0.5 [&>svg]:w-full [&>svg]:h-full"
        style={{ color: style.iconColor }}
      >
        {toastIcons[toast.type]}
      </span>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-xn-ink leading-snug">
          {toast.message}
        </p>
        {toast.description && (
          <p className="text-xs text-xn-ink-muted mt-0.5 leading-snug">
            {toast.description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onDismiss}
        className={[
          "inline-flex items-center justify-center",
          "w-5 h-5 shrink-0",
          "text-xn-ink-soft",
          "hover:text-xn-ink",
          "transition-colors duration-150",
          "cursor-pointer",
        ].join(" ")}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── useToast Hook ───────────────────────────────────────────
// Any component can import this to show toasts.
//
// Usage:
//   const toast = useToast();
//   toast.success("Saved!");

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast() must be used within a <ToastProvider>. " +
      "Make sure ToastProvider is in your layout.tsx."
    );
  }

  return context;
}