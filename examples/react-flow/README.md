# React Flow

[`FlowWithField.tsx`](FlowWithField.tsx) puts Surface Field behind a [React Flow](https://reactflow.dev) canvas in place of `<Background />`. The grid pans and zooms with the flow, every node clears the field under it, and a dragged or resized node carries its clearing with it.

The work is done by `FieldBridge`, a component that renders nothing. It subscribes to React Flow's store and forwards each change to the field's controller, without a React render:

| React Flow | Controller | Space |
| --- | --- | --- |
| `transform` (the camera) | `setViewport({ x, y, zoom })` | React Flow's own viewport |
| every measured node | `setScene({ root, rects })` | CSS px relative to the flow's root |
| nodes being dragged or resized | `setFootprint({ pointerId, rects, ids })` | viewport CSS px |

A node moves by a grip (its `dragHandle`) and resizes by one corner, a `NodeResizeControl` at the bottom right. A resize is a store change like a drag (`node.resizing` in place of `node.dragging`), so the clearing follows the live size on the same tick with no extra wiring. A press on the grip or the corner sends its footprint with `suppressRipple: true`, so the field lays no ring under a card in the hand. Give a resizable node an initial `width` and `height`. The example's colours are neutral greys, set through React Flow's `--xy-*` variables, so the field is the only coloured thing on the canvas.

Keep the field and the flow in one positioned box, the field first, and leave the flow's background transparent. `FieldBridge` must sit inside `ReactFlowProvider`.

The example needs `react`, `@xyflow/react` and `surface-field`. It is not part of the published package; the repository checks that it typechecks through `demo/tsconfig.examples.json`, and the demo's React Flow tab runs the same bridge live. See the [integration guide](../../docs/INTEGRATION.md#react-flow) for the options.
