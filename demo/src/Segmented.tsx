import * as React from "react";

import { cn } from "cn";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TWO OR THREE ANSWERS TO ONE QUESTION, AND THE ONE YOU ARE IN IS RAISED.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The grammar for a choice: THE OPTION YOU ARE IN IS THE ONE WEARING THE
 * PLATE. It was carried over from the design system this demo's chrome comes
 * from, markup, classes and hardware unchanged, so it reads as the same object
 * it is there.
 *
 * THE THUMB IS `.raised`, NOT A COPY OF IT. Everything that makes it look
 * lifted, the lit top edge that ends before the underside, the dark ring, the
 * face's short vertical falloff, is a raised plate's hardware, driven through
 * the `--raise-*` tokens in `index.css`. This control sets three of them and inherits
 * the rest, so a change to the object is a change here too and the two cannot
 * drift into being two similar things.
 *
 * WHAT THIS FILE OWNS is the geometry the button has no opinion about:
 *
 *   THE THUMB IS MEASURED, NOT LAID OUT. It has to be able to be BIGGER than
 * the cell it covers, and a grid child cannot overflow its own column.
 *
 *   IT GIVES BACK THE WHOLE PADDING. The thumb grows by exactly the track's
 * padding on all four sides, so its ring lands ON the track's edge and no rim
 * of track is left showing around the selected option. That rim is the tell
 * that gives away a segmented control built out of a highlight sitting in a
 * groove, and one pixel of it is still it.
 *
 *   ITS CORNER IS THE TRACK'S, NOT THE OPTION'S. A plate flush with an edge
 * has to follow that edge. The option keeps the smaller radius because the
 * option is what the padding used to inset, and it is never drawn.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EVERY RUNG IS A BUTTON'S RUNG, MEASURED ON THE OUTSIDE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A track and a press stand next to each other constantly: in a chrome row, at
 * the head of a form, beside a field. So the only question a caller should
 * have to answer is which rung, and the answer has to mean the same thing on
 * both controls. A button's ladder is the source and these are its four:
 *
 *   xs      h-7    28    sm      h-9    36
 *   default h-11   44    lg      h-13   52
 *
 * WHAT A SIZE MEANS HERE IS THE OUTSIDE. A track wraps its stations in two
 * pixels of its own, so the station is the rung minus four: 24, 32, 40, 48.
 * Sized on the inside instead, every one of these finished four pixels below
 * the press beside it, and `lg` finished six below a field, which is how this
 * was found.
 *
 * THE NAMES MAP BY RUNG AND NOT BY LETTER. `md` here is `default` there,
 * because that is the 44 both of them mean: a button's `default` and a field's
 * well are the same height, and this is that height.
 *
 * THE CORNERS ARE THE BUTTON'S TOKENS, so `--round-scale` reaches them. The station takes two pixels off the
 * track's, which is the inset it sits at: a shape inside a shape at the same
 * radius reads as a squarer shape.
 */
const SIZES = {
  xs: {
    track: "rounded-control-xs p-[2px]",
    thumb: "segmented-small rounded-[calc(var(--radius-control-xs)-2px)] top-0 bottom-0",
    option:
      "h-6 rounded-[calc(var(--radius-control-xs)-2px)] px-2.5 text-caption",
    give: 2,
  },
  sm: {
    track: "rounded-control-sm p-[2px]",
    thumb: "segmented-small rounded-[calc(var(--radius-control-sm)-2px)] top-0 bottom-0",
    option:
      "h-8 rounded-[calc(var(--radius-control-sm)-2px)] px-4 text-control",
    give: 2,
  },
  md: {
    track: "rounded-control p-[2px]",
    thumb: "rounded-[calc(var(--radius-control)-2px)] top-0 bottom-0",
    option: "h-10 rounded-[calc(var(--radius-control)-2px)] px-5 text-body",
    give: 2,
  },
  lg: {
    track: "rounded-control-lg p-[2px]",
    thumb: "rounded-[calc(var(--radius-control-lg)-2px)] top-0 bottom-0",
    option: "h-12 rounded-[calc(var(--radius-control-lg)-2px)] px-7 text-lead",
    give: 2,
  },
} as const;

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  narrow,
  width = "auto",
  controls,
  className,
  "aria-label": ariaLabel,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: keyof typeof SIZES;
  /**
   * THE SIZE BELOW `sm:`, WHICH IS USUALLY ONE STEP LARGER.
   *
   * A phone gives a control more room than a desktop, not less: the finger is
   * the pointer and the row it sits in is the width of the screen rather than
   * a corner of it. The demo's tabs ask for `sm`, which is right over a
   * canvas and small under a thumb.
   *
   * IT COMPOSES RATHER THAN SWITCHING, so both sizes are in the markup and the
   * breakpoint decides. There is no measurement to redo: `give` is 2 on both
   * `sm` and `md`, so the thumb's overhang is the same number at either width
   * and the geometry below never has to ask which one is showing. A pair that
   * straddled `lg` would need that, and this prop is deliberately not built to
   * take one.
   */
  narrow?: keyof typeof SIZES;
  /**
   * HOW WIDE THE TRACK IS, AND IT IS A QUESTION ABOUT THE ROW IT STANDS IN.
   *
   * `auto` is the default and the right answer beside something else: the
   * table's tabs sit on a line with a heading, and a control stretched across
   * that line would be claiming a row it is sharing.
   *
   * `full` is for a control that OWNS its row, which inside a form is every
   * control: the fields, the catalogue and the press all span the panel, and a
   * track hugging its labels in the middle of them reads as unfinished rather
   * than as compact. The options divide the width evenly, because choices that
   * are equals should not be sized by how long their words happen to be.
   */
  width?: "auto" | "full";
  /** The id of the region every option switches, for `aria-controls`. It is
one region and not one per option: a control announcing a panel that
only exists in one branch announces nothing half the time. */
  controls?: string;
  className?: string;
  "aria-label"?: string;
}) {
  /* EVERY UTILITY IN THE WIDE SIZE GETS `sm:`, so the narrow one holds below
     the breakpoint and the wide one takes over above it. Written as a map over
     the string rather than as a second table of prefixed classes, because two
     tables is how the two stop agreeing the first time either is retuned. */
  const at = (cls: string) =>
    cls
      .split(" ")
      .filter(Boolean)
      .map((c) => `sm:${c}`)
      .join(" ");
  const wide = SIZES[size];
  const s = narrow
    ? {
        track: `${SIZES[narrow].track} ${at(wide.track)}`,
        thumb: `${SIZES[narrow].thumb} ${at(wide.thumb)}`,
        option: `${SIZES[narrow].option} ${at(wide.option)}`,
        give: SIZES[narrow].give,
      }
    : wide;
  const track = React.useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = React.useState<{ pad: number; x: number; w: number } | null>(
    null,
  );
  /* ═══ THE PLATE SLIDES ONLY WHEN THE ANSWER CHANGES — 2026-09-24 ═════════
     .
     A resize of the track moves the plate too, and with the slide on it ran
     BEHIND the option it belongs to: dragging a column's width, the plate
     wobbled and trailed out of its own cell. A slide says *you picked another
     one*; a resize says nothing, so the plate simply is where its option is. */
  const slide = React.useRef(false);

  /**
   * THE NUMBERS ARE ROUNDED, and taken off rects rather than `offsetLeft`. A
   * label's width is fractional, and half a pixel of plate under a one pixel
   * ring is a ring that renders soft on one side and hard on the other. Fonts
   * land after first paint, so the measure is repeated once they have.
   *
   * A MEASURE THAT FOUND THE SAME RECT WRITES NOTHING. The functional update
   * hands React back the object it already holds, which is a bail-out and not
   * a render: the observer below fires on every resize of the track, and a
   * plate that has not moved is not news.
   */
  const give = s.give;
  const measure = React.useCallback(() => {
    const el = track.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-on="true"]');
    // A caller may intentionally have no matching option (for example a
    // custom value beside a set of presets). Clear the last measured thumb;
    // otherwise the old selection stays painted after every tab is false.
    if (!active) {
      setThumb(null);
      return;
    }
    const a = active.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    /* Rects arrive already multiplied by any `zoom` in the ancestry, and the
style below is written in unzoomed pixels. One ratio undoes it. */
    const scale = t.width / el.offsetWidth || 1;
    /* ═══ A SHARE OF THE TRACK, NOT A PIXEL OFFSET — 2026-09-24 ═══════════
       .
       The plate used to be written in pixels, and pixels are right only for
       the width they were measured at. Resize the column that holds a
       full-width track and every option moves at once, while the plate waits
       for the observer to measure again a frame later: it jumped out of its
       cell and back on every step of the drag. Written as a SHARE of the
       track's inner width, it rides the same layout pass as the options and
       has nothing to catch up with. The observer is still there for what a
       share cannot follow: a label that changes width. */
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const inner = el.offsetWidth - pad * 2 || 1;
    const x = Math.round((((a.left - t.left) / scale - pad) / inner) * 1e4) / 1e4;
    const w = Math.round((a.width / scale / inner) * 1e4) / 1e4;
    setThumb((last) => (last && last.pad === pad && last.x === x && last.w === w ? last : { pad, x, w }));
  }, [give]);

  /* ═══ KEYED ON THE ANSWERS, NOT ON THE ARRAY THAT CARRIES THEM ═══════════
     .
     Every caller writes `options` inline, so the array is a new object on
     every render of whatever holds the control — and keyed on it, each of
     those renders re-read two rects (a forced layout in the middle of the
     commit), threw away the observer and built a new one. A toolbar can hold
     several of these, and a drag re-renders it per move: that was 9-18ms of
     every click spent measuring plates that had not moved.
     .
     WHAT CAN MOVE THE PLATE is which option is on and which options there
     are, so the key is the values joined. A label that changes width without
     changing its value is the observer's business, and it is watching every
     option for exactly that. */
  const answers = options.map((o) => o.value).join("\u0000");

  React.useLayoutEffect(() => {
    slide.current = true;
    measure();
  }, [value, answers, measure]);

  /* ONE OBSERVER PER SET OF OPTIONS, which is one for the control's life in
     every caller there is: it is rebuilt only when the buttons it watches are
     not the same buttons any more. */
  React.useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      slide.current = false;
      measure();
    });
    ro.observe(el);
    for (const o of el.children) ro.observe(o);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [answers, measure]);

  return (
    <div
      ref={track}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "segmented",
        s.track,
        /* `.segmented` is `inline-flex`, so the track hugs unless it is told
           otherwise. `flex` and not `w-full` alone: an inline-flex box with a
           width still shrink-wraps its children, and the options only divide
           the row once the track is a block-level flex container. */
        width === "full" && "flex w-full",
        className,
      )}
    >
      {/* ═══ THE MEASURED PLATE, AND IT CANNOT EXIST ON THE FIRST PAINT ════
          .
          Its place is read off the active option with `getBoundingClientRect`
          and the server has no boxes, so the markup that arrives from the
          server carries no plate at all: the control was painting an empty
          track with two words in it, and drawing the selection a frame later.
          On a refresh that reads as the control forgetting which one you were
          on. The plate inside the active option below is what stands in until
          this one has been measured, and the two are the same object. */}
      {thumb ? (
        <span
          aria-hidden
          className={cn("segmented-thumb segmented-face raised", s.thumb)}
          style={{
            left: `calc(${thumb.pad - give}px + ${thumb.x} * (100% - ${thumb.pad * 2}px))`,
            width: `calc(${thumb.w} * (100% - ${thumb.pad * 2}px) + ${give * 2}px)`,
            ...(slide.current ? null : { transition: "none" }),
          }}
        />
      ) : null}

      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          aria-controls={controls}
          data-on={value === o.value}
          className={cn(
            "segmented-option",
            s.option,
            /* EQUAL SHARES, NOT SHARES BY LABEL LENGTH. `basis-0` so a long
               word cannot claim more of the row than a short one, which is
               what `flex-1` alone would allow. */
            width === "full" && "flex-1 basis-0",
          )}
          onClick={() => onChange(o.value)}
        >
          {/* ═══ THE PLATE BEFORE THERE IS A MEASUREMENT ══════════════════
              .
              The same two classes the sliding thumb wears, drawn as a child of
              the option it belongs to rather than as a box positioned over it.
              That is the whole trick: an option knows where it is without
              anybody measuring anything, so this is correct in the server's
              markup, at every width, for labels of any length, and it is
              exactly what the measured plate will cover when it arrives.
              .
              `-z-10` PUTS IT UNDER THE WORD AND NOT UNDER THE TRACK.
              `.segmented-option` is `position: relative; z-index: 1`, which
              makes it a stacking context, so a negative layer inside it cannot
              fall out of the option. Above the track, below the label.
              .
              THE INSET IS THE THUMB'S OWN OVERHANG. `give` is what the plate
              stands proud of its option by, and it is the same number the
              measurement adds on both sides, so nothing moves at the handover.
              .
              IT GOES AWAY THE MOMENT THE REAL ONE EXISTS. Two plates for one
              selection is a plate that is left behind the first time the
              control is pressed. */}
          {!thumb && value === o.value ? (
            <span
              aria-hidden
              className={cn("segmented-face raised absolute -z-10", s.thumb)}
              style={{ inset: -s.give }}
            />
          ) : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
