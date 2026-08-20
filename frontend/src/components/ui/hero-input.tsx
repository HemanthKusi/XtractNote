"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// ─────────────────────────────────────────────────────────────
// HeroInput
// ─────────────────────────────────────────────────────────────
// The field that leads a page — the create screen and the dashboard.
// Everywhere else uses <Input>; this exists because a field that is
// the whole point of a screen should not look like one in a toolbar.
//
// Two behaviours the ordinary Input does not have:
//
//   1. The placeholder cycles through suggestions while the field is
//      idle, and stops the moment the caret lands. Rotating text under
//      a live cursor is distracting, so focus — not the first
//      keystroke — is what silences it.
//
//   2. On submit the typed text dissolves. The text is drawn to a
//      canvas, read pixel by pixel, and then a clearing edge sweeps
//      right to left while the pixels ahead of it scatter. The sweep
//      is what makes it read as the text being wiped away rather than
//      simply exploding.
//
// Both are held to the reduced-motion setting: the placeholder stops
// cycling and the field clears instantly with no particles.
// ─────────────────────────────────────────────────────────────

interface HeroInputProps {
  /** Suggestions cycled through while the field is idle and empty */
  placeholders: string[];
  /** Icon rendered before the text */
  prefix?: ReactNode;
  /** Rendered after the input — usually the submit button */
  suffix?: ReactNode;
  /** Called with the current value when the field is submitted */
  onSubmit?: (value: string) => void;
  /** Called on every keystroke */
  onValueChange?: (value: string) => void;
  /** Show the error border and error focus ring */
  error?: boolean;
  disabled?: boolean;
  /** How long each suggestion is shown, in milliseconds */
  rotateMs?: number;
}

/** One dissolving pixel of the typed text. */
interface Particle {
  x: number;
  y: number;
  r: number;
}

const CANVAS_W = 800;
const CANVAS_H = 200;

export function HeroInput({
  placeholders,
  prefix,
  suffix,
  onSubmit,
  onValueChange,
  error = false,
  disabled = false,
  rotateMs = 3000,
}: HeroInputProps) {
  const reduceMotion = useReducedMotion();

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  const [value, setValue] = useState("");
  const [index, setIndex] = useState(0);
  // Mirrors index for the interval, which would otherwise close over
  // the value from the render that started it.
  const indexRef = useRef(0);
  // The line on its way out. Both are rendered for the length of the
  // transition so one can leave upward while the next arrives from
  // below — which is the part a presence library would otherwise do.
  const [leaving, setLeaving] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [vanishing, setVanishing] = useState(false);

  // The cycle runs only while the field is idle: empty, unfocused, not
  // mid-animation, and on a visible tab. Any of those turning false
  // stops it, which is why this is one effect rather than several.
  const idle =
    !focused && !value && !vanishing && !reduceMotion && placeholders.length > 1;

  useEffect(() => {
    if (!idle) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        // Both updates are issued from here rather than one being set
        // inside the other's updater. A state updater must be pure —
        // React may call it more than once for a single update, which
        // would fire the outgoing line twice and make the cycle stutter.
        const current = indexRef.current;
        const next = (current + 1) % placeholders.length;
        indexRef.current = next;
        setLeaving(current);
        setIndex(next);
      }, rotateMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [idle, placeholders.length, rotateMs]);

  /** Draw the current text and read it back as particles. */
  const readParticles = useCallback((): Particle[] => {
    const input = inputRef.current;
    const canvas = canvasRef.current;
    if (!input || !canvas) return [];

    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const styles = getComputedStyle(input);
    const fontSize = parseFloat(styles.fontSize);

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Drawn at twice the size and displayed at half, so the dissolve
    // keeps its detail on a high-density screen.
    ctx.font = `${fontSize * 2}px ${styles.fontFamily}`;
    ctx.fillStyle = styles.color;
    ctx.textBaseline = "middle";
    ctx.fillText(input.value, 0, CANVAS_H / 2);

    const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const found: Particle[] = [];
    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        if (data[(y * CANVAS_W + x) * 4 + 3] > 40) {
          found.push({ x, y, r: 1 });
        }
      }
    }
    return found;
  }, []);

  const clearField = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Back to nothing, so it is not occupying the field while idle.
      canvas.width = 0;
      canvas.height = 0;
    }
    particlesRef.current = [];
    setVanishing(false);
    setValue("");
    onValueChange?.("");
  }, [onValueChange]);

  /** Sweep a clearing edge leftwards, scattering everything ahead of it.
   *
   *  The recursion lives in a local function rather than the memoized
   *  one calling itself: a self-referencing useCallback closes over its
   *  own first version, so later renders would keep driving the stale
   *  one. */
  const sweep = useCallback(
    (startEdge: number) => {
      const step = (edge: number) => {
        requestAnimationFrame(() => {
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) {
            clearField();
            return;
          }

          const next: Particle[] = [];
          for (const p of particlesRef.current) {
            if (p.x < edge) {
              next.push(p);
              continue;
            }
            if (p.r <= 0) continue;
            p.x += Math.random() > 0.5 ? 1 : -1;
            p.y += Math.random() > 0.5 ? 1 : -1;
            p.r -= 0.05 * Math.random();
            next.push(p);
          }
          particlesRef.current = next;

          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          const styles = inputRef.current
            ? getComputedStyle(inputRef.current)
            : null;
          ctx.fillStyle = styles?.color ?? "currentColor";
          for (const p of next) {
            if (p.x > edge) ctx.fillRect(p.x, p.y, p.r, p.r);
          }

          if (next.length > 0) step(edge - 10);
          else clearField();
        });
      };

      step(startEdge);
    },
    [clearField]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value || vanishing) return;

    onSubmit?.(value);

    if (reduceMotion) {
      clearField();
      return;
    }

    const found = readParticles();
    if (found.length === 0) {
      clearField();
      return;
    }

    particlesRef.current = found;
    setVanishing(true);
    sweep(found.reduce((max, p) => (p.x > max ? p.x : max), 0));
  };

  const showPlaceholder = !value && !focused && !vanishing;

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "relative flex items-center w-full",
        "h-[68px] gap-3.5 pl-[22px] pr-2.5 rounded-xn-xl",
        "bg-xn-surface border",
        "transition-[border-color,box-shadow] duration-xn ease-xn",
        error
          ? "border-xn-danger focus-within:shadow-[0_0_0_4px_var(--xn-danger-soft)]"
          : "border-xn-border-strong hover:border-xn-ink-soft focus-within:border-xn-ink focus-within:shadow-xn-ring",
        disabled ? "opacity-45 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {prefix && (
        <span className="inline-flex shrink-0 w-[22px] h-[22px] text-xn-ink-soft [&>svg]:w-full [&>svg]:h-full">
          {prefix}
        </span>
      )}

      {/* The field itself. It stays the layout owner so the placeholder
          and canvas can be positioned against it rather than guessed at. */}
      <span className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            if (vanishing) return;
            setValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
          className={[
            "w-full appearance-none bg-transparent text-h5",
            // The wrapper owns the focus ring. Without silencing the
            // inner control explicitly, the global focus style draws a
            // second box around the text itself.
            "border-none outline-none focus-visible:outline-none",
            vanishing ? "text-transparent" : "text-xn-ink",
          ].join(" ")}
        />

        {/* Sits inside the input's own box, so it can never overlap the
            leading icon however the field is sized. */}
        {/* A window the lines travel through. Without the clip they
            simply move around inside the field; with it, the strip
            appears to advance past an opening. */}
        {showPlaceholder && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {leaving !== null && leaving !== index && (
              <span
                key={`leaving-${leaving}`}
                onAnimationEnd={() => setLeaving(null)}
                className="absolute inset-0 flex items-center truncate text-h5 text-xn-ink-soft animate-rise-out motion-reduce:hidden"
              >
                {placeholders[leaving]}
              </span>
            )}
            <span
              key={`current-${index}`}
              className="absolute inset-0 flex items-center truncate text-h5 text-xn-ink-soft animate-rise-in motion-reduce:animate-none"
            >
              {placeholders[index]}
            </span>
          </span>
        )}

        {/* Sized to nothing until a dissolve actually needs it. A canvas
            defaults to 300x150, which is a phantom box sitting inside the
            field for its entire idle life. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          width={0}
          height={0}
          className={[
            "pointer-events-none absolute left-0 top-1/2 origin-left",
            "-translate-y-1/2 scale-50",
            vanishing ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </span>

      {suffix && <span className="inline-flex shrink-0">{suffix}</span>}
    </form>
  );
}
