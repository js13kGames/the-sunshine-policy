# Editing the atlas

`atlas.svg` contains eight complete scene backgrounds, five whole characters,
and 18 independent objects and effects. The ending reuses the palace terrace.
Scenery stays together: buildings, landscape, fixed furniture and decoration
are edited within the corresponding scene group.

## Editing

Open the SVG, enter a named group such as `MillScene`, `Nell`, `Unicorn`, or
`Bench`, and edit its shapes. Preserve the IDs and keep new shapes inside
that group. Each character contains its complete geometry.

Save and run `make` to import your changes and rebuild the game. `make atlas`
updates only the readable source at `/src/`. Reload the browser afterward.
Neither command overwrites the atlas. `make test` checks the import and plays
through the game.

The outer `slot-*` groups arrange the sheet. Moving or scaling a slot changes
only the atlas layout. Edit the inner named group to change the artwork.
Captions and cell backgrounds are excluded from the game.

## Reused objects

Characters and independent objects have one master each. Game scenes refer
to these masters instead of storing their own copies. The same applies to
clouds and the diagram symbols embedded in backgrounds: their `<use>` links
refer to the separate `Cloud`, `Sun`, `Drop`, and `Horn` masters.

## Scene states

Moving and changing scenery remains inside its complete background. Keep
these internal IDs, which the game uses to select the current state:

- `MillScene`: `MillWater` supplies the water shape; its `currentColor` tint
  changes when the sluice opens. `MillCurrent` contains the animated current.
- `SluiceScene`: `GatePanel` moves upward; `SluiceWater` becomes visible.
- `EngineScene`: `BrokenReleaseCord` and `ReleaseCord` are the two cord states.
- `RoofScene`: `Sunbeam` becomes visible after installing the prism.

The sheet shows the initial state. Hidden state groups can be revealed in
an SVG editor to edit them. The game controls their visibility, the gate
position, and the water tint. Geometry edits are retained in every state.

Object placements, animation timing, interactions, and puzzle logic remain
in `src/src.js`. Large changes to proportions may require adjusting scene
hotspots or attachment positions there. Generated definitions in
`src/index.html` are replaced by the next import; edit the atlas instead.

`atlas.json` lists the complete graphics and required state IDs. Missing or
duplicate IDs and broken references fail the import. Local SVG gradients,
clips, styles, and references are supported; external images and fonts are
not part of this self-contained SVG workflow.
