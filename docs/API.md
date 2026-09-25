# API

The package entry exports `SurfaceField`, `createSurfaceFieldController`, and their public TypeScript types. React is the only runtime peer.

## Component

`SurfaceField` accepts `className`, `style`, `containerRef`, `controller`, and `interactionRoot`. The host controls size and position with `style` or its own classes. The component enforces clipping and `pointer-events: none`. `interactionRoot` is the element in which primary presses may create held rings; without it, a primary press within the field can create a free ring. It does not make the decorative canvas interactive.

The existing visual knobs are retained to preserve rendering behavior:

Supply finite, positive `gap` and `focusRadius` values, and a host box with nonzero dimensions. The renderer does not clamp invalid geometry props. It paints no background; the host supplies the surface behind the canvases.

| Prop | Default | Meaning |
| --- | ---: | --- |
| `gap` | `22` | Dot spacing in CSS px |
| `focusRadius` | `260` | Spotlight reach in CSS px |
| `lineRadius` | `focusRadius * 0.25` | Connected line reach in CSS px |
| `baseOpacity`, `maxOpacity` | `0.05`, `0.26` | Ambient and focal dot opacity |
| `tint` | `0.22` | Accent blend at the focal center; zero disables it |
| `tintVar` | `--surface-field-tint` | CSS property read on the document root for the accent |
| `tintHueVar`, `tintHue` | unset, `293` | Optional inherited angle property and base hue; overrides `tintVar` |
| `rippleSpeed`, `rippleWidth` | `0.6`, `38` | Ring speed in px/ms and crest width in px |
| `rippleBoost`, `rippleGrow`, `ripplePush` | `0.14`, `0.3`, `6` | Ring brightness, dot growth and displacement |
| `cursorPush`, `cursorPushRadius` | `0`, `110` | Local pointer displacement in CSS px |
| `connected` | `false` | Draw the line fabric on a second canvas |
| `breathe`, `breatheRate` | `1`, `1` | Share of breathing dots and their speed multiplier |
| `still`, `wander` | `false`, `true` | Disable the moving light or its autonomous drift |

`ripple={{ x, y, at }}` requests one ring for each new `at`. `x` and `y` are CSS pixels relative to the field's own box. `null` disables programmatic rings. `still` keeps the field at one focal position but can still breathe; reduced motion stops both light and breath.

The component reads dot color from inherited CSS `color`. After changing inline color or an ancestor's CSS theme, call `controller.refreshTheme()` to repaint, unless the change is to the document root's class, which is observed automatically. An initial color is read at mount without a controller.

## Controller

Create a controller once for each field instance and pass it as `controller`. It is an imperative update path: calls do not render React. A scene submitted before mount is replayed on attachment; transient previews and footprints are deliberately not replayed after a remount. `setScene(null)` clears the retained scene. The controller rejects two simultaneous field attachments.

| Method | Coordinates and behavior |
| --- | --- |
| `setScene({ root, rects })` | Each `{ id, parent, left, top, right, bottom }` rectangle is in CSS pixels relative to `root`'s border box. The field converts it to its own canvas box when drawing. |
| `setFootprint({ pointerId, rects, ids?, initial?, suppressRipple? })` | Rectangles are viewport CSS pixels. `initial: true` reuses the press capture box. `suppressRipple` removes the held ring when another gesture owns that press. `ids` identifies carried scene objects. |
| `setPreview({ rect, committed? })` | The rectangle is viewport CSS pixels. `null` ends the preview; `committed` lets its light fade after commitment. |
| `refreshTheme()` | Rereads inherited color and accent, then repaints even if the motion loop is asleep. |

The controller and field do not inspect a host's object model. Invalid or empty rectangles are ignored by the renderer. Keep an interaction root and its scene root mounted while sending updates.
