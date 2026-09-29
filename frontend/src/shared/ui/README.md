# shared/ui

Reusable presentation primitives (buttons, inputs, avatars, badges, cards, overlays).
Each one styles itself with Tailwind utility classes; a component with more than one
variant keeps its class recipe in a colocated `*.styles.ts` beside it.

Rules:

- Components here consume design tokens through the Tailwind theme in
  `shared/styles/theme.css` (`bg-surface`, `text-text-muted`, `rounded-md`, `p-4`). They
  never define raw colors, spacing or radii of their own, and they ship no CSS file.
- A component accepts `className` and merges it last with `cn()` from `shared/utils`, so
  the caller can adjust layout without overriding the recipe.
- Nothing here calls REST or WebSocket, reads a domain store, or imports a feature.
- A new shared component starts feature-local and moves here once a second feature
  needs it.

## Icon

`Icon` is the one way the UI renders an icon. It wraps Font Awesome's SVG renderer and
takes a name from the project icon set in `Icon/icons.ts`:

```tsx
<Icon name="chat" />
<Icon name="close" label="Close" />
<Icon name="disconnected" spin className="text-primary" />
```

The SVG is `1em` square and inherits `currentColor`, so font-size and text-color utilities
on the icon or its parent size and color it. An icon with a `label` is exposed to
assistive technology as an image; an icon without one is hidden, which is correct when
adjacent text already says the same thing.

Icons are imported one by one in `Icon/icons.ts`, so the bundle carries only the icons the
set lists. A screen that needs a new icon adds it to that map rather than importing from
the library directly.
