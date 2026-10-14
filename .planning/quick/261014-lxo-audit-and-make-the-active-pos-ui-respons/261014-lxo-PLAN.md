# Quick Task: Responsive POS Layout

## Objective
Make the active standalone POS interface usable on phones, tablets, and desktop without hiding core workflows or allowing the page itself to overflow horizontally.

## Scope
- Adapt the existing standalone interface in `index.html` while preserving its current layout and business behavior.
- Improve safe-area handling, touch targets, small-screen forms/modals, and constrained-height layouts.
- Keep wide data tables usable through their existing local horizontal scroll containers.

## Verification
- Parse the inline JavaScript after edits.
- Inspect the current app at desktop and narrow viewport sizes if the available browser supports viewport emulation.
- Run existing local unit tests; report any viewport/device coverage that cannot be tested here.
