# API

The package entry exports `SurfaceField`, `createSurfaceFieldController`, and their public TypeScript types. React is the only runtime peer.

## Component

`SurfaceField` accepts `className`, `style`, `containerRef`, `controller`, and `interactionRoot`. The host controls size and position with `style` or its own classes. The component enforces clipping and `pointer-events: none`. `interactionRoot` is the element in which primary presses may create held rings; without it, a primary press within the field can create a free ring. It does not make the decorative canvas interactive.

The existing visual knobs are retained to preserve rendering behavior:

Supply finite, positive `gap` and `focusRadius` values, and a host box with nonzero dimensions. The renderer does not clamp invalid geometry props. It paints no background; the host supplies the surface behind the canvases.

| Prop | Default | Meaning |
| --- | ---: | --- |
| `gap` | `22` | Dot spacing in CSS px |
| `focusRadius` | `250` | Spotlight reach in CSS px |
| `lineRadius` | `focusRadius * 0.25` | Connected line reach in CSS px |
| `baseOpacity`, `maxOpacity` | `0.05`, `0.26` | Ambient and focal dot opacity |
| `tint` | `0.22` | Accent blend at the focal center; zero disables it |
| `tintVar` | `--surface-field-tint` | CSS property read on the document root for the accent |
| `tintHueVar`, `tintHue` | unset, `293` | Optional inherited angle property and base hue; overrides `tintVar` |
| `rippleSpeed`, `rippleWidth` | `0.6`, `38` | Ring speed in px/ms and crest width in px |
| `surfacePadding` | `0` | Signed CSS px adjustment to the fade outside scene and carried surface rectangles; effective fade width is `max(0, abs(rippleWidth) + surfacePadding)` |
| `rippleBoost`, `rippleGrow`, `ripplePush` | `0.14`, `0.3`, `6` | Ring brightness, dot growth and displacement |
| `cursorPush`, `cursorPushRadius` | `0`, `110` | Local pointer displacement in CSS px |
| `connected` | `false` | Draw the line fabric on a second canvas |
| `breathe`, `breatheRate` | `1`, `1` | Share of breathing dots and their speed multiplier |
| `still`, `wander` | `false`, `true` | Disable the moving light or its autonomous drift |
| `viewport` | `{ x: 0, y: 0, zoom: 1 }` | Host camera for the dot grid, React Flow semantics; see below |
| `worker` | unset | Factory for a module worker running `surface-field/worker`; draws off the main thread, see below |

`ripple={{ x, y, at }}` requests one ring for each new `at`. `x` and `y` are CSS pixels relative to the field's own box. `null` disables programmatic rings. `still` keeps the field at one focal position but can still breathe; reduced motion stops both light and breath.

`surfacePadding` changes the empty fade outside each surface without changing ripple width or displacement. At `0`, the existing fade is unchanged. Positive values move fully visible dots and lines farther from a surface; negative values bring them closer. The rectangle interior and boundary stay empty at every value. It applies to scene rectangles and temporary carried footprints, not to the outer canvas edge. Supply a finite value; the demo exposes -32 to 64 px.

`viewport={{ x, y, zoom }}` makes the dot and line grid a floor below the host's graph. React Flow's transform draws a world point `(wx, wy)` at `(wx * zoom + x, wy * zoom + y)` CSS px from the field's root. The grid pans 1:1 with that camera: a camera move of `d` screen px moves every dot by `d`. It scales less than the graph, by `s = clamp(zoom ^ 0.4, 0.7, 1.6)`, so its spacing is `gap * s`: 15.4 to 35.2 px at the default gap. A zoom scales the grid about the screen point that the camera kept fixed (a wheel or pinch keeps the pointer fixed). When that point is outside the field, the grid scales about the last pointer position, and without one it scales about the centre. The grid is carried from one camera to the next, not recomputed from the world origin, so it never slides or jumps when zoom changes. Every zoom draws the same dots, the same connected lines and the same opacity. Each zoom also sends a soft ring out from its anchor, at 0.4 of a press ring's strength, at most one every 250 ms, and each ring fades over 1 s. `still` and reduced motion send no ring. Dot radius, the cursor light, rings, scene rectangles, footprints and previews all stay in screen space. Non-finite values fall back to `0` and `1`; zoom is clamped to `[0.001, 1000]`. A camera change never re-renders React work and never restarts the field: the latest value is applied once, on the next animation frame, as one full canvas repaint.

`worker={() => new Worker(...)}` moves drawing into a dedicated worker. The factory must start a module worker whose entry is the package's `surface-field/worker` export; the host builds it because only its bundler can resolve a worker URL (with Vite: `import FieldWorker from "surface-field/worker?worker"` and `worker={() => new FieldWorker()}`). The field transfers its canvases with `transferControlToOffscreen` and runs the same drawing engine there, so the picture is identical; the main thread keeps the pointer, resize, theme and controller listeners and posts their input once per animation frame. Without `Worker`, `OffscreenCanvas` or `transferControlToOffscreen`, or when the factory throws or the worker reports an error, the field draws on the main thread for the rest of that mount. The prop is read once per mount for whether it is set; a new factory identity does not restart the field. One worker belongs to one mounted field and is terminated on unmount.

When `connected` is enabled, each line uses tangents from its neighboring displaced grid dots to curve through its exact endpoint dots. A flat field retains straight lines.

The component reads dot color from inherited CSS `color`. After changing inline color or an ancestor's CSS theme, call `controller.refreshTheme()` to repaint, unless the change is to the document root's class, which is observed automatically. An initial color is read at mount without a controller.

## Controller

Create a controller once for each field instance and pass it as `controller`. It is an imperative update path: calls do not render React. A scene submitted before mount is replayed on attachment; transient previews and footprints are deliberately not replayed after a remount. `setScene(null)` clears the retained scene. The controller rejects two simultaneous field attachments.

| Method | Coordinates and behavior |
| --- | --- |
| `setScene({ root, rects })` | Each `{ id, parent, left, top, right, bottom }` rectangle is in CSS pixels relative to `root`'s border box. The field converts it to its own canvas box when drawing. |
| `setFootprint({ pointerId, rects, ids?, initial?, suppressRipple? })` | Rectangles are viewport CSS pixels. `initial: true` reuses the press capture box. `suppressRipple` removes the held ring when another gesture owns that press. `ids` identifies carried scene objects. |
| `setPreview({ rect, committed? })` | The rectangle is viewport CSS pixels. `null` ends the preview; `committed` lets its light fade after commitment. |
| `refreshTheme()` | Rereads inherited color and accent, then repaints even if the motion loop is asleep. |
| `setViewport({ x, y, zoom })` | Same meaning as the `viewport` prop. Retained like the scene and replayed on attachment. After the first call the controller owns the camera and the prop is ignored for that field. Calls within one frame coalesce into one repaint. |

### Shapes

Every rectangle above, in the scene, a footprint or a preview, may say what the surface is besides its box. Without these fields it is a plain rectangle, as before.

| Field | Meaning |
| --- | --- |
| `radius` | Corner radius in CSS pixels, clamped to half the shorter side. A square at half its side is a circle, a bar a pill. Pass the card's own `border-radius` so the clearing matches its corners. |
| `shape: "ellipse"` | An ellipse inscribed in the box instead of a rectangle. `radius` does not apply. |
| `rotation` | Clockwise turn in degrees about the box's centre, as CSS `rotate()`. `left`..`bottom` stay the box before the turn, which is what layout reports as the element's size. |

The clearing, the light, the push on dots and lines and the carried surface's fabric clip all follow the shape. A plain rectangle keeps its original, cheapest path.

The controller and field do not inspect a host's object model. Invalid or empty rectangles are ignored by the renderer. Keep an interaction root and its scene root mounted while sending updates.
