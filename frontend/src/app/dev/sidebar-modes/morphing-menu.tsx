"use client";

// src/app/dev/sidebar-modes/morphing-menu.tsx
//
// ONE menu, floating in every mode. Specimen only; never ships.
//
// ── Built against SearchInput, this system's own fluid control ──
//
// That component (on the component branch, not yet on main) is the answer to
// every question this menu kept getting wrong, and its header says so plainly:
//
//   "It is not a merge. At rest there is one pill. On open, the pill widens
//    and slides right while a round bubble stays behind on the left — and
//    because both shapes sit inside a gooey SVG filter, they stretch apart
//    like liquid before they separate."
//
// So the separation here is the same mechanic turned ninety degrees. The body
// slides DOWN to its docked place while the close bubble stays behind at the
// anchor and scales up from nothing. Neither shape is tweened toward the
// other; the stretch is the filter's doing.
//
// Three things copied exactly rather than approximated:
//
//   the curve   cubic-bezier(0.34, 1.38, 0.5, 1) at 460ms — it OVERSHOOTS,
//               which is what "fluid" meant all along
//   the filter  stdDeviation 7, alpha matrix 20 / -10
//   the region  x/y -50%, width/height 200% — without it the goo is clipped
//               at the layer's own box and the neck is cut off square
//
// And one thing dropped: the light-to-ink inversion. SearchInput is
// `bg-xn-ink text-xn-bg` at rest AND expanded — it never inverts. The rising
// ground was the outside reference's brand logic, not ours, so the menu is
// simply ink in all three modes and one more moving part is gone.

import { useId, useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

import { PanelArrowIcon, type AnimatedIconProps } from "./menu-icons";
import {
  BEAT,
  CLOSE_D,
  closeGeometryFor,
  geometryFor,
  GOO,
  HOVER_TO_CENTRE,
  hoverSink,
  ICON,
  LABEL_GAP,
  MENU_ENTRIES,
  MENU_TITLE_PX,
  PANEL_HOVER,
  PANEL_HOVER_MS,
  TITLE_HOVER_WEIGHT,
  titleCentreShift,
  titleRise,
  type PanelHoverSettings,
  MORPH_CSS_EASE,
  MORPH_CUBIC,
  MORPH_EASE_ID,
  ICON_SPEED,
  ICON_ZOOM,
  ZOOM_MS,
  PAD,
  PANEL_W,
  ROW_GAP,
  ROW_H,
  stepFrom,
  type MenuMode,
} from "./menu-modes";

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

// SearchInput's own surface: ink ground, page-coloured glyphs, at every size.
const ON_INK = "var(--xn-bg)";
const ON_INK_DIM = "color-mix(in srgb, var(--xn-bg) 66%, transparent)";
const ON_INK_ACTIVE = "color-mix(in srgb, var(--xn-bg) 15%, transparent)";
const ON_INK_HOVER = "color-mix(in srgb, var(--xn-bg) 8%, transparent)";


// ── The menu glyph ──────────────────────────────────────────
//
// The supplied hamburger, kept exactly as it works: ONE long path whose
// visible portion is chosen by stroke-dasharray, plus a rotation on the svg.
//
//   at rest    dasharray 12 63   -> only the top bar shows
//   open       dasharray 20 300, dashoffset -32.42, svg rotate(-45deg)
//
// Because the dash window slides along a single continuous path rather than
// two separate shapes crossfading, the bars genuinely travel into the cross.
// The numbers are the reference's and are meaningless apart from this exact
// path — change one and you must re-derive the others.
//
// The middle line is a second path that just rotates with the svg.
//
// Duration is synced to the shape morph rather than kept at the reference's
// 600ms: at 600 the glyph was still finishing after the menu had settled,
// which reads as lag rather than as one gesture. The curve is the
// reference's own.
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

function Row({
  renderIcon,
  label,
  active,
  rail,
  unavailable,
  morphMs,
  onSelect,
  ariaLabel,
  justify,
  iconPx,
  iconZoom,
  reduced,
  panelHover,
}: {
  /** Given whether the row is being hovered, so an icon can loop while it is. */
  renderIcon: (playing: boolean) => React.ReactNode;
  label: string;
  active: boolean;
  rail: boolean;
  unavailable?: boolean;
  morphMs: number;
  onSelect: () => void;
  ariaLabel?: string;
  justify?: "start" | "end";
  iconPx: number;
  iconZoom: number;
  reduced: boolean;
  /** Set on rows whose glyph zooms and gets cropped in the panel. */
  panelHover?: PanelHoverSettings;
}) {
  const [hover, setHover] = useState(false);
  const centred = rail || justify === "end";
  // The panel hover and the dock zoom are the same gesture in two modes, so
  // they are deliberately exclusive: `rail` picks one or the other, never both.
  const cropping = !!panelHover && !rail && !unavailable && !reduced;
  const glyphH = iconPx * (panelHover?.zoom ?? 1);
  const sink = panelHover
    ? hoverSink(panelHover.variant === "slot" ? iconPx : ROW_H, glyphH, panelHover.crop)
    : 0;
  const shift = panelHover?.variant === "row" ? HOVER_TO_CENTRE : 0;
  // Only the "row" variant stacks title over glyph; the slot crops inside the
  // glyph's own box and leaves the title exactly where it was.
  const rise = panelHover?.variant === "row" ? titleRise(ROW_H, glyphH, panelHover.crop) : 0;
  return (
    <button
      type="button"
      data-menu-row
      disabled={unavailable}
      title={rail || !label ? label : undefined}
      aria-label={ariaLabel}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={[
        // text-ui is the scale's nav/buttons/chrome step, the same one
        // SearchInput's own label uses.
        "flex shrink-0 items-center rounded-xn-pill text-ui font-medium",
        unavailable ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      style={{
        height: ROW_H,
        width: justify === "end" && !rail ? ROW_H : "100%",
        marginLeft: justify === "end" && !rail ? "auto" : undefined,
        // The label collapses to zero width in the dock, but a flex GAP still
        // occupies its space — so the icon sat 6px (half the gap) left of
        // centre while the arrow, which renders no label at all, sat true.
        // The gap has to go when there is nothing on the other side of it.
        gap: centred ? 0 : LABEL_GAP,
        justifyContent: centred ? "center" : "flex-start",
        paddingLeft: centred ? 0 : (ROW_H - iconPx) / 2,
        paddingRight: centred ? 0 : (ROW_H - iconPx) / 2,
        color: active ? ON_INK : ON_INK_DIM,
        opacity: unavailable ? 0.4 : 1,
        backgroundColor: active ? ON_INK_ACTIVE : hover && !unavailable ? ON_INK_HOVER : "transparent",
        // The "row" variant lets the glyph leave its slot, so the pill is what
        // crops it. Kept on for the whole panel mode rather than only while
        // hovered, or the glyph would escape the row on the way back out.
        overflow: cropping && panelHover?.variant === "row" ? "hidden" : undefined,
        transition: `background-color 150ms ease, color 150ms ease, padding ${morphMs}ms ${MORPH_CSS_EASE}`,
      }}
    >
      {/* One icon zooms at a time — the hovered one, and only in the dock.
          A transform rather than a size change, so nothing below it moves and
          no two rows can ever collide. React owns this outright; GSAP never
          touches a glyph's transform, so there is no ownership to fight over. */}
      <span
        data-menu-glyph
        className="shrink-0"
        style={{
          width: iconPx,
          height: iconPx,
          transform: `scale(${rail && hover && !unavailable && !reduced ? iconZoom : 1})`,
          // The "slot" variant crops with the glyph's own box, so the overflow
          // goes here instead of on the pill.
          overflow: cropping && panelHover?.variant === "slot" ? "hidden" : undefined,
          transition: `transform ${ZOOM_MS}ms ${MORPH_CSS_EASE}`,
        }}
      >
        {/* A second box, because the two transforms have different owners and
            different origins: the outer one is the dock's zoom about the row,
            the inner one is the panel's crop about the glyph. Composing them on
            one element would mean rebuilding the whole string on every state. */}
        <span
          data-menu-glyph-inner
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          style={{
            transform: cropping && hover ? `translate(${shift}px, ${sink}px) scale(${panelHover?.zoom})` : undefined,
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
            maxWidth: rail || justify === "end" ? 0 : PANEL_W,
            opacity: rail || justify === "end" ? 0 : 1,
            // In the panel the title takes the remainder and centres in it, so
            // that the shift below can put it on the row's own axis — the same
            // axis the glyph travels to. In the dock it collapses to nothing
            // and none of this applies.
            flexGrow: centred ? 0 : 1,
            textAlign: centred ? "left" : "center",
            transform: centred
              ? undefined
              : `translate(${titleCentreShift(iconPx)}px, ${cropping && hover ? -rise : 0}px)`,
            // DM Sans carries a 100..1000 weight axis, so this eases across
            // rather than stepping. The text is centred, so the width it gains
            // grows either side of the same axis and nothing moves.
            fontWeight: cropping && hover ? TITLE_HOVER_WEIGHT : undefined,
            transition: `max-width ${morphMs}ms ${MORPH_CSS_EASE}, opacity ${rail ? morphMs * 0.3 : morphMs}ms ${MORPH_CSS_EASE}, transform ${PANEL_HOVER_MS}ms ${MORPH_CSS_EASE}, font-weight ${PANEL_HOVER_MS}ms ${MORPH_CSS_EASE}`,
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

export function MorphingMenu({
  mode,
  onModeChange,
  activeId,
  onSelect,
  railWidth,
  shellHeight,
  morphMs,
  iconPx = ICON,
  iconZoom = ICON_ZOOM,
  iconSpeed = ICON_SPEED,
  menuTitlePx = MENU_TITLE_PX,
  panelHover = PANEL_HOVER,
  enableAll = false,
  icons,
}: {
  mode: MenuMode;
  onModeChange: (m: MenuMode) => void;
  activeId: string;
  onSelect: (id: string) => void;
  railWidth: number;
  shellHeight: number;
  morphMs: number;
  /** Dialled in the harness; defaults to SearchInput's 16px glyph. */
  iconPx?: number;
  /** How far the hovered icon zooms, dock mode only. */
  iconZoom?: number;
  /** Playback rate for the icon loops. Below 1 is slower. */
  iconSpeed?: number;
  /** Size of the bar's own title, beside the close glyph. */
  menuTitlePx?: number;
  /** Which box crops the zoomed glyph in the panel, and by how much. */
  panelHover?: PanelHoverSettings;
  /**
   * Harness only. Extension and Settings are inert in the product because
   * neither route exists, which also means their icons never receive hover and
   * can never be seen animating. This lifts that for testing WITHOUT touching
   * the entries themselves, so the shipped state stays honest.
   */
  enableAll?: boolean;
  icons: Record<string, React.ComponentType<AnimatedIconProps>>;
}) {
  const reduced = usePrefersReducedMotion();

  // useId is stable across server and client; its colons are not valid inside
  // a CSS url() reference, so they go. Same trick SearchInput uses, and the
  // reason two menus on one page cannot steal each other's filter.
  const filterId = `xn-goo-${useId().replace(/:/g, "")}`;

  const bodyBlob = useRef<HTMLDivElement>(null);
  const bodyShadow = useRef<HTMLDivElement>(null);
  const closeBlob = useRef<HTMLDivElement>(null);
  const bodyContent = useRef<HTMLDivElement>(null);
  const closeContent = useRef<HTMLButtonElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  // GSAP owns geometry from first paint. React must never write left/top/
  // width/height/border-radius into these elements' style, or every re-render
  // resets them to the expanded constants and the next tween starts from the
  // wrong box — which is exactly what made the morph look like two motions.
  const didInit = useRef(false);

  const collapsed = mode === "floating";
  const rail = mode === "rail";
  const open = !collapsed;

  useGSAP(
    () => {
      const body = geometryFor(mode, railWidth, shellHeight);
      const close = closeGeometryFor(mode, railWidth, shellHeight);
      const rows = rowsRef.current?.querySelectorAll("[data-menu-row]") ?? [];
      const D = reduced ? 0 : morphMs / 1000;
      const ease = MORPH_EASE_ID;

      const bodyTargets = [bodyBlob.current, bodyContent.current, bodyShadow.current];
      const closeTargets = [closeBlob.current, closeContent.current];

      // First paint: place everything, animate nothing.
      if (!didInit.current) {
        didInit.current = true;
        gsap.set(bodyTargets, { left: body.left, top: body.top, width: body.width, height: body.height, borderRadius: body.radius });
        gsap.set(closeTargets, { left: close.left, top: close.top, width: close.width, height: close.height, borderRadius: close.radius, scale: open ? 1 : 0 });
        gsap.set(rows, { opacity: open ? 1 : 0 });
        return;
      }

      const tl = gsap.timeline();

      // One tween, one curve, every dimension. The spring is the event.
      // border-radius rides along: the browser clamps it to half the short
      // side by itself, so 999 simply means "as round as this box allows".
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
    { dependencies: [mode, railWidth, shellHeight, morphMs, reduced], scope: bodyBlob },
  );

  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          {/* The region matters as much as the values: without -50%/200% the
              filter is clipped to the layer's box and the neck is cut off
              square, which is precisely the artefact that made this read as
              two rectangles instead of one substance. */}
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
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ filter: `url(#${filterId})` }}>
        <div
          ref={bodyBlob}
          className="absolute bg-xn-ink"
        />
        <div
          ref={closeBlob}
          className="absolute bg-xn-ink"
        />
      </div>

      {/* Content layer: rows and glyphs, unfiltered, on identical geometry. */}
      <div
        ref={bodyContent}
        onClick={() => {
          if (collapsed) onModeChange(stepFrom(mode));
        }}
        className="absolute z-30"
        style={{ cursor: collapsed ? "pointer" : "default" }}
      >
        <div
          ref={rowsRef}
          aria-hidden={collapsed}
          className="flex flex-col"
          style={{ padding: PAD, gap: ROW_GAP, pointerEvents: collapsed ? "none" : "auto" }}
        >
          {/* The arrow leads the list, pushed right and carrying no label —
              its direction already says what it does. In the dock there is no
              right to speak of, so it lands centred.

              It takes `playing` like every other row icon now, where the bare
              chevron it replaces ignored the argument and so was the one glyph
              in the menu that could never animate. */}
          <Row
            renderIcon={(playing) => (
              <PanelArrowIcon
                direction={rail ? "expand" : "collapse"}
                playing={playing}
                size={iconPx}
                reduced={reduced}
                speed={iconSpeed}
              />
            )}
            label=""
            ariaLabel={rail ? "Expand menu" : "Collapse menu to icons"}
            active={false}
            rail={rail}
            justify="end"
            morphMs={morphMs}
            iconPx={iconPx}
            iconZoom={iconZoom}
            reduced={reduced}
            onSelect={() => onModeChange(stepFrom(mode))}
          />

          {MENU_ENTRIES.map((e) => (
            <Row
              key={e.id}
              renderIcon={(playing) => {
                const Icon = icons[e.id];
                // One rule for every nav row: the loop is the dock's, and the
                // panel gets the crop below instead. The arrow above is the
                // only glyph that loops in both, and it is not an entry.
                return Icon ? (
                  <Icon playing={playing && rail} size={iconPx} reduced={reduced} speed={iconSpeed} />
                ) : null;
              }}
              panelHover={panelHover}
              label={e.label}
              active={e.id === activeId}
              rail={rail}
              unavailable={enableAll ? undefined : e.unavailable}
              morphMs={morphMs}
              iconPx={iconPx}
              iconZoom={iconZoom}
              reduced={reduced}
              onSelect={() => onSelect(e.id)}
            />
          ))}
        </div>

        {/* The button's face, drawn only once the menu IS the button. */}
        {/* The button's face. Same glyph the close carries, so pressing one
            and seeing the other is a single icon continuing its move rather
            than two icons swapping. */}
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            color: ON_INK,
            opacity: collapsed ? 1 : 0,
            transition: `opacity ${morphMs * 0.4}ms ${MORPH_CSS_EASE}`,
          }}
        >
          <MenuGlyph open={!collapsed} size={iconPx * 1.5} ms={morphMs} />
        </span>
      </div>

      {/* The close's own face, riding its bubble. */}
      <button
        ref={closeContent}
        type="button"
        aria-label="Close menu"
        onClick={() => onModeChange("floating")}
        className="absolute z-30 flex cursor-pointer items-center overflow-hidden rounded-full"
        style={{
          // The glyph is the only child in flow, pinned right in both modes.
          // In the dock the bar is a CLOSE_D square, so a padding of half the
          // leftover centres the glyph without switching justifyContent —
          // which used to flip space-between to center and snap, since neither
          // keyword can be tweened.
          paddingRight: rail ? (CLOSE_D - iconPx * 1.5) / 2 : PAD + (ROW_H - iconPx) / 2,
          justifyContent: "flex-end",
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          color: ON_INK,
          transition: `opacity ${morphMs * 0.35}ms ${MORPH_CSS_EASE}, padding ${morphMs}ms ${MORPH_CSS_EASE}`,
        }}
      >
        {/* Centred on the BAR, which spans the panel — so the title lands on
            the same axis as the row titles below it, now that those are centred
            too. It used to be given a left padding that cleared the panel
            padding, the row padding, a glyph and its gap, which put it exactly
            where a left-aligned row label began; centring the row labels left
            that 49px adrift. Taken out of flow so it centres on the bar rather
            than on whatever the glyph leaves. */}
        <span
          className="pointer-events-none absolute inset-x-0 overflow-hidden whitespace-nowrap text-center font-mono uppercase tracking-[0.08em]"
          style={{
            // Dialled rather than a scale step, because the size that reads as
            // "the same as the close" is a judgement the geometry cannot settle.
            fontSize: menuTitlePx,
            lineHeight: 1.3,
            opacity: rail ? 0 : 0.72,
            transition: `opacity ${rail ? morphMs * 0.3 : morphMs}ms ${MORPH_CSS_EASE}`,
          }}
        >
          Menu
        </span>

        <span className="flex shrink-0 items-center justify-center">
          <MenuGlyph open={!collapsed} size={iconPx * 1.5} ms={morphMs} />
        </span>
      </button>
    </>
  );
}
