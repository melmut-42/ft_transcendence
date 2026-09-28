# shared/ui

Reusable presentation primitives (buttons, inputs, avatars, badges, cards, overlays)
with their component-scoped CSS colocated beside them.

Rules:

- Components here consume design tokens from `shared/styles/tokens.css` through the Tailwind theme in `shared/styles/tailwind.css`. They never
  define raw colors, spacing or radii of their own.
- Nothing here calls REST or WebSocket, reads a domain store, or imports a feature.
- A new shared component starts feature-local and moves here once a second feature
  needs it.
