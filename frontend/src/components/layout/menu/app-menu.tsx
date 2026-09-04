"use client";

// src/components/layout/menu/app-menu.tsx
//
// ONE menu, floating in every mode.
//
// ── Built against SearchInput, this system's own fluid control ──
//
// That component is the answer to every question this menu kept getting wrong,
// and its header says so plainly: it is not a merge. At rest there is one pill.
// On open, the pill widens and slides while a round bubble stays behind — and
// because both shapes sit inside a gooey SVG filter, they stretch apart like
// liquid before they separate.
//
// So the separation here is the same mechanic turned ninety degrees. The body
// slides DOWN to its docked place while the close bubble stays behind at the
// anchor and scales up from nothing. Neither shape is tweened toward the other;
// the stretch is the filter's doing.
//
// Three things copied exactly rather than approximated: the curve, which
// OVERSHOOTS; the filter's stdDeviation and alpha matrix; and the filter
// REGION, without which the goo is clipped at the layer's own box and the neck
// is cut off square.
//
// And one thing dropped: the light-to-ink inversion. SearchInput is ink at rest
// AND expanded — it never inverts. The rising ground was an outside reference's
// brand logic, not ours, so the menu is simply ink in all three modes.
//
// ── Two ownership rules that are not style preferences ──
//
// 1. GSAP owns geometry outright. React must never write left/top/width/height/
//    border-radius into these elements' style, or every re-render resets them
//    to their initial constants and the next tween starts from the wrong box.
//    That is what once made the morph look like two separate motions.
// 2. React owns the glyph wrapper's transform, GSAP owns what is inside the
//    svg. They compose instead of overwriting each other every frame.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

import { MENU_ICONS, PanelArrowIcon } from "./menu-icons";
import {
  BEAT,
  CLOSE_D,
  closeGeometryFor,
  geometryFor,
  GOO,
  HOVER_TO_CENTRE,
  hoverSink,
  ICON,
  ICON_SPEED,
  ICON_ZOOM,
  LABEL_GAP,
  MENU_ENTRIES,
  MENU_TITLE_PX,
  MORPH_CSS_EASE,
  MORPH_CUBIC,
  MORPH_EASE_ID,
  MORPH_MS,
  PAD,
  PANEL_HOVER,
  PANEL_HOVER_MS,
  PANEL_W,
  pageForPathname,
  ROW_GAP,
  ROW_H,
  stepFrom,
  TITLE_HOVER_WEIGHT,
  titleCentreShift,
  titleRise,
  ZOOM_MS,
  type MenuMode,
  type PageId,
} from "./menu-geometry";

gsap.registerPlugin(CustomEase, useGSAP);
if (!CustomEase.get(MORPH_EASE_ID)) {
  // CustomEase takes the overshoot in its stride; the control point above 1 is
  // the entire point of the curve.
  CustomEase.create(MORPH_EASE_ID, `M0,0 C${MORPH_CUBIC.split(", ").join(",")} 1,1`);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * The shell's height, which the docked modes run the full length of.
 *
 * Seeded from `window` rather than from zero, so the first paint places the
 * menu at its real height instead of animating up from nothing on mount. The
 * server has no window and renders 0, which is safe here only because this
 * value reaches GSAP and never the markup — no inline geometry is server
 * rendered, so there is nothing for hydration to disagree about.
 */
function useShellHeight(): number {
  const [h, setH] = useState(() => (typeof window === "undefined" ? 0 : window.innerHeight));
  useEffect(() => {
    const read = () => setH(window.innerHeight);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return h;
}

// SearchInput's own surface: ink ground, page-coloured glyphs, at every size.
const ON_INK = "var(--xn-bg)";
const ON_INK_DIM = "color-mix(in srgb, var(--xn-bg) 66%, transparent)";
const ON_INK_ACTIVE = "color-mix(in srgb, var(--xn-bg) 15%, transparent)";
const ON_INK_HOVER = "color-mix(in srgb, var(--xn-bg) 8%, transparent)";

// ── The menu glyph ──────────────────────────────────────────
//
// The supplied hamburger, kept exactly as it works: ONE long path whose visible
// portion is chosen by stroke-dasharray, plus a rotation on the svg.
//
//   at rest    dasharray 12 63   -> only the top bar shows
//   open       dasharray 20 300, dashoffset -32.42, svg rotate(-45deg)
//
// Because the dash window slides along a single continuous path rather than two
// separate shapes crossfading, the bars genuinely travel into the cross. The
// numbers are meaningless apart from this exact path — change one and the
// others must be re-derived.
const GLYPH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

function MenuGlyph({ open, size, ms }: { open: boolean; size: number; ms: number }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 3,
    transition: `stroke-dasharray ${ms}ms ${GLYPH_EASE}, stroke-dashoffset ${ms}ms ${GLYPH_EASE}`,
  };
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        width: size,
        height: size,
        transform: `rotate(${open ? -45 : 0}deg)`,
        transition: `transform ${ms}ms ${GLYPH_EASE}`,
      }}
    >
      <path
        style={{
          ...stroke,
          strokeDasharray: open ? "20 300" : "12 63",
          strokeDashoffset: open ? -32.42 : 0,
        }}
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
      />
      <path style={stroke} d="M7 16 27 16" />
    </svg>
  );
}

// ── A row ───────────────────────────────────────────────────
//
// Rows that have a destination render as real LINKS, so middle-click, "open in
// new tab", the status-bar URL preview and keyboard activation all behave the
// way navigation is expected to. Two deliberate exceptions:
//
//   - `unavailable` rows have nowhere to go yet, so they render as a disabled
//     button. A disabled button is genuinely inert and is announced as
//     unavailable; a <span aria-disabled> is neither.
//   - the arrow is a control rather than a destination, so it is a button.
//
// `onNavigate` lets a preview surface show the active state without leaving the
// page. The row stays a real link with a real href — the handler only cancels
// the navigation.

type RowProps = {
  renderIcon: (playing: boolean) => React.ReactNode;
  label: string;
  active?: boolean;
  rail: boolean;
  reduced: boolean;
  /** Set on rows whose glyph zooms and gets cropped in the panel. */
  cropInPanel?: boolean;
  ariaLabel?: string;
  justify?: "start" | "end";
} & (
  | { href: string; unavailable?: false; onNavigate?: () => void; onPress?: never }
  | { href?: never; unavailable: true; onNavigate?: never; onPress?: never }
  | { href?: never; unavailable?: false; onNavigate?: never; onPress: () => void }
);

function Row(props: RowProps) {
  const { renderIcon, label, active = false, rail, reduced, cropInPanel, ariaLabel, justify } = props;
  const unavailable = props.unavailable === true;
  const [hover, setHover] = useState(false);

  const centred = rail || justify === "end";
  // The panel crop and the dock zoom are the same gesture in two modes, so they
  // are deliberately exclusive: `rail` picks one or the other, never both.
  const cropping = !!cropInPanel && !rail && !unavailable && !reduced;
  const glyphH = ICON * PANEL_HOVER.zoom;
  const sink = hoverSink(ROW_H, glyphH, PANEL_HOVER.crop);
  const rise = titleRise(ROW_H, glyphH, PANEL_HOVER.crop);

  const className = [
    // text-ui is the scale's nav/buttons/chrome step, the same one
    // SearchInput's own label uses.
    "flex shrink-0 items-center rounded-xn-pill text-ui font-medium",
    unavailable ? "cursor-default" : "cursor-pointer",
  ].join(" ");

  const style: React.CSSProperties = {
    height: ROW_H,
    width: justify === "end" && !rail ? ROW_H : "100%",
    marginLeft: justify === "end" && !rail ? "auto" : undefined,
    // The label collapses to zero width in the dock, but a flex GAP still
    // occupies its space — so the icon sat half a gap left of centre while the
    // arrow, which renders no label at all, sat true. The gap has to go when
    // there is nothing on the other side of it.
    gap: centred ? 0 : LABEL_GAP,
    justifyContent: centred ? "center" : "flex-start",
    paddingLeft: centred ? 0 : (ROW_H - ICON) / 2,
    paddingRight: centred ? 0 : (ROW_H - ICON) / 2,
    color: active ? ON_INK : ON_INK_DIM,
    opacity: unavailable ? 0.4 : 1,
    backgroundColor: active ? ON_INK_ACTIVE : hover && !unavailable ? ON_INK_HOVER : "transparent",
    // The glyph leaves its slot in the panel, so the pill is what crops it.
    // Kept on for the whole panel mode rather than only while hovered, or the
    // glyph would escape the row on the way back out.
    overflow: cropping ? "hidden" : undefined,
    transition: `background-color 150ms ease, color 150ms ease, padding ${MORPH_MS}ms ${MORPH_CSS_EASE}`,
  };

  const content = (
    <>
      {/* One icon zooms at a time — the hovered one, and only in the dock. A
          transform rather than a size change, so nothing below it moves. */}
      <span
        className="shrink-0"
        style={{
          width: ICON,
          height: ICON,
          transform: `scale(${rail && hover && !unavailable && !reduced ? ICON_ZOOM : 1})`,
          transition: `transform ${ZOOM_MS}ms ${MORPH_CSS_EASE}`,
        }}
      >
        {/* A second box, because the two transforms have different owners and
            different origins: the outer one is the dock's zoom about the row,
            the inner one is the panel's crop about the glyph. */}
        <span
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          style={{
            transform:
              cropping && hover
                ? `translate(${HOVER_TO_CENTRE}px, ${sink}px) scale(${PANEL_HOVER.zoom})`
                : undefined,
            transition: `transform ${PANEL_HOVER_MS}ms ${MORPH_CSS_EASE}`,
          }}
        >
          {renderIcon(hover && !unavailable && !reduced)}
        </span>
      </span>
      {label && (
        <span
          className="overflow-hidden whitespace-nowrap"
          style={{
            maxWidth: centred ? 0 : PANEL_W,
            opacity: centred ? 0 : 1,
            // In the panel the title takes the remainder and centres in it, so
            // the shift below puts it on the row's own axis — the same axis the
            // glyph travels to. In the dock it collapses to nothing.
            flexGrow: centred ? 0 : 1,
            textAlign: centred ? "left" : "center",
            transform: centred
              ? undefined
              : `translate(${titleCentreShift(ICON)}px, ${cropping && hover ? -rise : 0}px)`,
            fontWeight: cropping && hover ? TITLE_HOVER_WEIGHT : undefined,
            transition: `max-width ${MORPH_MS}ms ${MORPH_CSS_EASE}, opacity ${rail ? MORPH_MS * 0.3 : MORPH_MS}ms ${MORPH_CSS_EASE}, transform ${PANEL_HOVER_MS}ms ${MORPH_CSS_EASE}, font-weight ${PANEL_HOVER_MS}ms ${MORPH_CSS_EASE}`,
          }}
        >
          {label}
        </span>
      )}
    </>
  );

  const shared = {
    "data-menu-row": true,
    className,
    style,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: rail && label ? label : undefined,
  };

  if (props.unavailable) {
    return (
      <button type="button" disabled {...shared}>
        {content}
      </button>
    );
  }

  if (props.href) {
    const { href, onNavigate } = props;
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        {...shared}
        onClick={
          onNavigate &&
          ((event: React.MouseEvent) => {
            event.preventDefault();
            onNavigate();
          })
        }
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={ariaLabel} onClick={props.onPress} {...shared}>
      {content}
    </button>
  );
}

export interface AppMenuProps {
  mode: MenuMode;
  onModeChange: (m: MenuMode) => void;
  /**
   * Overrides the row the current URL would highlight. Preview surfaces only —
   * in the app the menu reads the router itself.
   */
  activePage?: PageId;
  /**
   * Preview hook: cancels the row's navigation and reports which row was
   * clicked instead, so a showcase can demonstrate active states in place.
   */
  onNavigate?: (page: PageId) => void;
  /**
   * Preview surfaces only. The docked modes run the full height of the shell,
   * which in the app is the viewport — but a showcase renders this inside a
   * fixed box, and a menu measuring the window there would run straight out of
   * it. Omitted everywhere except that box.
   */
  shellHeight?: number;
}

export function AppMenu({ mode, onModeChange, activePage, onNavigate, shellHeight }: AppMenuProps) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const viewportHeight = useShellHeight();
  const height = shellHeight ?? viewportHeight;

  // The URL is the source of truth; the prop is an override for previews.
  const active = activePage ?? pageForPathname(pathname);

  // useId is stable across server and client; its colons are not valid inside a
  // CSS url() reference, so they go. The same trick SearchInput uses, and the
  // reason two menus on one page cannot steal each other's filter.
  const filterId = `xn-goo-${useId().replace(/:/g, "")}`;

  const bodyBlob = useRef<HTMLDivElement>(null);
  const bodyShadow = useRef<HTMLDivElement>(null);
  const closeBlob = useRef<HTMLDivElement>(null);
  const bodyContent = useRef<HTMLDivElement>(null);
  const closeContent = useRef<HTMLButtonElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  const collapsed = mode === "floating";
  const rail = mode === "rail";
  const open = !collapsed;

  useGSAP(
    () => {
      const body = geometryFor(mode, height);
      const close = closeGeometryFor(mode, height);
      const rows = rowsRef.current?.querySelectorAll("[data-menu-row]") ?? [];
      const D = reduced ? 0 : MORPH_MS / 1000;
      const ease = MORPH_EASE_ID;

      const bodyTargets = [bodyBlob.current, bodyContent.current, bodyShadow.current];
      const closeTargets = [closeBlob.current, closeContent.current];

      // First paint: place everything, animate nothing.
      if (!didInit.current) {
        didInit.current = true;
        gsap.set(bodyTargets, {
          left: body.left, top: body.top, width: body.width, height: body.height, borderRadius: body.radius,
        });
        gsap.set(closeTargets, {
          left: close.left, top: close.top, width: close.width, height: close.height,
          borderRadius: close.radius, scale: open ? 1 : 0,
        });
        gsap.set(rows, { opacity: open ? 1 : 0 });
        return;
      }

      const tl = gsap.timeline();

      // One tween, one curve, every dimension. The spring is the event.
      tl.to(
        bodyTargets,
        { left: body.left, top: body.top, width: body.width, height: body.height, borderRadius: body.radius, duration: D, ease },
        0,
      );

      // The close does NOT travel toward or away from the body. It sits at the
      // anchor and scales out of nothing while the body leaves — SearchInput's
      // bubble, rotated. The stretch between them is the filter, not a tween.
      tl.to(
        closeTargets,
        { left: close.left, width: close.width, borderRadius: close.radius, scale: open ? 1 : 0, duration: D, ease },
        0,
      );

      tl.to(
        rows,
        {
          opacity: open ? 1 : 0,
          duration: open ? D * BEAT.rowDuration : D * BEAT.rowsOut,
          ease,
          stagger: open && !reduced ? D * BEAT.rowStagger : 0,
        },
        open ? D * BEAT.rowDelay : 0,
      );

      return () => {
        tl.kill();
      };
    },
    { dependencies: [mode, height, reduced], scope: bodyBlob },
  );

  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          {/* The region matters as much as the values: without -50%/200% the
              filter is clipped to the layer's box and the neck is cut off
              square, which is the artefact that made this read as two
              rectangles instead of one substance. */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={GOO.blur} result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${GOO.alpha} ${GOO.shift}`}
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Elevation on the BODY alone, unfiltered, behind everything. Chained
          onto the gooey layer it made the close cast into the gap and leave a
          dark band between the two shapes. */}
      <div
        ref={bodyShadow}
        aria-hidden
        className="pointer-events-none absolute z-10"
        style={{ boxShadow: "var(--xn-elev-3)" }}
      />

      {/* Shape layer: colour only, gooey, no content. Text through a Gaussian
          blur rasterises and looks filthy at small sizes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{ filter: `url(#${filterId})` }}
      >
        <div ref={bodyBlob} className="absolute bg-xn-ink" />
        <div ref={closeBlob} className="absolute bg-xn-ink" />
      </div>

      {/* Content layer: rows and glyphs, unfiltered, on identical geometry. */}
      <nav ref={bodyContent} aria-label="Main" className="absolute z-30">
        <div
          ref={rowsRef}
          aria-hidden={collapsed}
          className="flex flex-col"
          style={{ padding: PAD, gap: ROW_GAP, pointerEvents: collapsed ? "none" : "auto" }}
        >
          {/* The arrow leads the list, pushed right and carrying no label — its
              direction already says what it does. In the dock there is no right
              to speak of, so it lands centred. It is also the one glyph that
              animates in both modes; every destination's loop is the dock's. */}
          <Row
            renderIcon={(playing) => (
              <PanelArrowIcon
                direction={rail ? "expand" : "collapse"}
                playing={playing}
                size={ICON}
                reduced={reduced}
                speed={ICON_SPEED}
              />
            )}
            label=""
            ariaLabel={rail ? "Expand menu" : "Collapse menu to icons"}
            rail={rail}
            reduced={reduced}
            justify="end"
            onPress={() => onModeChange(stepFrom(mode))}
          />

          {MENU_ENTRIES.map((entry) => {
            const Icon = MENU_ICONS[entry.id];
            const renderIcon = (playing: boolean) =>
              Icon ? (
                // One rule for every destination: the loop belongs to the dock,
                // and the panel gets the crop instead.
                <Icon playing={playing && rail} size={ICON} reduced={reduced} speed={ICON_SPEED} />
              ) : null;

            if (entry.unavailable || !entry.href) {
              return (
                <Row
                  key={entry.id}
                  renderIcon={renderIcon}
                  label={entry.label}
                  rail={rail}
                  reduced={reduced}
                  unavailable
                />
              );
            }

            return (
              <Row
                key={entry.id}
                renderIcon={renderIcon}
                label={entry.label}
                href={entry.href}
                active={active === entry.id}
                rail={rail}
                reduced={reduced}
                cropInPanel
                onNavigate={onNavigate && (() => onNavigate(entry.id))}
              />
            );
          })}
        </div>

        {/* The button's face, and the control that reopens it — the same
            element, because the collapsed menu IS the button.

            It carries the same glyph the close bar carries, so pressing one and
            seeing the other reads as a single icon continuing its move rather
            than two icons swapping.

            A real <button> rather than a click handler on the nav: the nav is
            not focusable and has no keyboard behaviour, so collapsing the menu
            with a keyboard used to strand it — the rows go aria-hidden and
            nothing focusable could bring them back. tabIndex tracks the mode so
            an invisible control is never in the tab order. */}
        <button
          type="button"
          aria-label="Open menu"
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
          onClick={() => onModeChange(stepFrom(mode))}
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full"
          style={{
            color: ON_INK,
            opacity: collapsed ? 1 : 0,
            pointerEvents: collapsed ? "auto" : "none",
            transition: `opacity ${MORPH_MS * 0.4}ms ${MORPH_CSS_EASE}`,
          }}
        >
          <MenuGlyph open={!collapsed} size={ICON * 1.5} ms={MORPH_MS} />
        </button>
      </nav>

      {/* The close's own face, riding its bubble. */}
      <button
        ref={closeContent}
        type="button"
        aria-label="Collapse menu"
        aria-hidden={collapsed}
        tabIndex={collapsed ? -1 : 0}
        onClick={() => onModeChange("floating")}
        className="absolute z-30 flex cursor-pointer items-center overflow-hidden rounded-full"
        style={{
          // The glyph is the only child in flow, pinned right in both modes. In
          // the dock the bar is a CLOSE_D square, so a padding of half the
          // leftover centres it without switching justifyContent — which used
          // to flip space-between to center and snap, since neither keyword can
          // be tweened.
          paddingRight: rail ? (CLOSE_D - ICON * 1.5) / 2 : PAD + (ROW_H - ICON) / 2,
          justifyContent: "flex-end",
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          color: ON_INK,
          transition: `opacity ${MORPH_MS * 0.35}ms ${MORPH_CSS_EASE}, padding ${MORPH_MS}ms ${MORPH_CSS_EASE}`,
        }}
      >
        {/* Centred on the BAR, which spans the panel — so the title lands on the
            same axis as the row titles below it. Taken out of flow so it
            centres on the bar rather than on whatever the glyph leaves. */}
        <span
          className="pointer-events-none absolute inset-x-0 overflow-hidden whitespace-nowrap text-center font-mono uppercase tracking-[0.08em]"
          style={{
            fontSize: MENU_TITLE_PX,
            lineHeight: 1.3,
            opacity: rail ? 0 : 0.72,
            transition: `opacity ${rail ? MORPH_MS * 0.3 : MORPH_MS}ms ${MORPH_CSS_EASE}`,
          }}
        >
          Menu
        </span>

        <span className="flex shrink-0 items-center justify-center">
          <MenuGlyph open={!collapsed} size={ICON * 1.5} ms={MORPH_MS} />
        </span>
      </button>
    </>
  );
}
