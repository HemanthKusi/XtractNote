"use client";

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
// Dialog overlay with backdrop, centered content, and close behavior.
//
// Structure:
//   ┌──────────────── viewport ────────────────┐
//   │  ░░░░░░░░░ dark backdrop ░░░░░░░░░░░░░░  │
//   │  ░░ ┌──────────────────────────┐ ░░░░░░  │
//   │  ░░ │ [title]           [✕]    │ ░░░░░░  │
//   │  ░░ │ description              │ ░░░░░░  │
//   │  ░░ ├──────────────────────────┤ ░░░░░░  │
//   │  ░░ │                          │ ░░░░░░  │
//   │  ░░ │   children (content)     │ ░░░░░░  │
//   │  ░░ │                          │ ░░░░░░  │
//   │  ░░ ├──────────────────────────┤ ░░░░░░  │
//   │  ░░ │         [footer actions] │ ░░░░░░  │
//   │  ░░ └──────────────────────────┘ ░░░░░░  │
//   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
//   └──────────────────────────────────────────┘
//
// Close triggers:
//   - Click the ✕ button
//   - Click the backdrop (outside the content box)
//   - Press the Escape key
//
// Usage:
//   <Modal
//     open={isOpen}
//     onClose={() => setIsOpen(false)}
//     title="Save to Folder"
//     description="Choose where to save this content."
//     footer={
//       <>
//         <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
//         <Button variant="primary" onClick={handleSave}>Save</Button>
//       </>
//     }
//   >
//     <FolderList />
//   </Modal>
// ─────────────────────────────────────────────────────────────

import {
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

// ── Size Definitions ────────────────────────────────────────
// Controls the max-width of the modal content box.

const sizeClasses = {
  sm: "max-w-sm",     // 384px — confirmations, simple dialogs
  md: "max-w-md",     // 448px — forms, folder selection (default)
  lg: "max-w-lg",     // 512px — larger forms, content previews
  xl: "max-w-xl",     // 576px — complex content, multi-step flows
} as const;

type ModalSize = keyof typeof sizeClasses;

// ── Props ───────────────────────────────────────────────────

interface ModalProps {
  /** Controls visibility. true = modal is shown. */
  open: boolean;
  /** Called when the modal should close (backdrop click, Escape, ✕ button) */
  onClose: () => void;
  /** Header title text */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** Width of the content box */
  size?: ModalSize;
  /** Main content inside the modal */
  children?: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** If true, clicking the backdrop does NOT close the modal.
      Use for critical actions where accidental dismissal is dangerous. */
  persistent?: boolean;
}

// ── Close Icon ──────────────────────────────────────────────

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
    <path
      d="M4 4l8 8M12 4l-8 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

// ── Component ───────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  persistent = false,
}: ModalProps) {
  // Ref for the content box — used to detect "click outside" (backdrop clicks)
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Escape Key Handler ──
  // Listen for the Escape key while the modal is open.
  // When pressed, close the modal.
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    // Cleanup: remove the listener when the modal closes or unmounts.
    // Without this, the listener would pile up every time the modal opens.
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // ── Scroll Lock ──
  // When the modal is open, prevent the page behind from scrolling.
  // When it closes, restore normal scrolling.
  useEffect(() => {
    if (!open) return;

    // Save the current overflow style so we can restore it
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // ── Backdrop Click Handler ──
  // Close when clicking the dark area behind the content box.
  // We check if the click target is the backdrop itself (not a child).
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If the click happened directly on the backdrop (not on the content box)
      if (e.target === e.currentTarget && !persistent) {
        onClose();
      }
    },
    [onClose, persistent]
  );

  // Don't render anything when the modal is closed.
  // This removes it from the DOM entirely (no hidden elements).
  if (!open) return null;

  return (
    // ── Backdrop (full-screen overlay) ──
    // position: fixed covers the entire viewport regardless of scroll position.
    // z-50 puts it above all other content.
    // The dark background uses rgba for semi-transparency.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={handleBackdropClick}
      // Accessibility: the backdrop is a dialog container
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-desc" : undefined}
    >
      {/* ── Content Box ──
          The white card in the center. Uses the same surface styling
          as our Card component but with specific modal behavior. */}
      <div
        ref={contentRef}
        className={[
          "w-full",
          sizeClasses[size],
          "bg-xn-surface",
          "border border-xn-border",
          "rounded-xn-xl",
          "shadow-xn-lg",
          "animate-scale-in",
          "overflow-hidden",
        ].join(" ")}
      >
        {/* ── Header ── */}
        {(title || description) && (
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-h3 font-semibold text-xn-ink"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-desc"
                    className="text-sm text-xn-ink-muted mt-1"
                  >
                    {description}
                  </p>
                )}
              </div>

              {/* Close button — always visible in the top-right corner */}
              <button
                onClick={onClose}
                className={[
                  "inline-flex items-center justify-center",
                  "w-7 h-7 rounded-xn-sm shrink-0",
                  "text-xn-ink-soft",
                  "hover:bg-xn-surface-alt hover:text-xn-ink",
                  "transition-colors duration-150",
                  "cursor-pointer",
                ].join(" ")}
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {children && (
          <div className="px-6 py-4">{children}</div>
        )}

        {/* ── Footer ──
            Typically holds Cancel + Confirm buttons, right-aligned. */}
        {footer && (
          <div className="px-6 pb-5 pt-2 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export types
export type { ModalSize };