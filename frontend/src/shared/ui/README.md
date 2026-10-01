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
- No user-facing text is written here. Every label a primitive shows or announces — a
  close or dismiss button's name, Try again, an empty seat, the HOST and READY badges —
  comes in through props, already translated by the caller with `t()`. A loading ring
  without a `label` is decorative and hidden from assistive technology.
- A new shared component starts feature-local and moves here once a second feature
  needs it.

## Primitives

`index.ts` is the entry point: `import { Button, Input, Modal } from '@shared/ui'`.

| Component                           | Use it for                                                       |
| ----------------------------------- | ---------------------------------------------------------------- |
| `Button`                            | Any labelled action, in the `fill`, `outline` and `text` themes. |
| `ButtonIcon`                        | Circular icon-only action. It requires an `aria-label`.          |
| `Input`, `Textarea`, `FieldMessage` | Labelled fields with hint, error and success lines.              |
| `Avatar`                            | Player picture with its team ring and online dot.                |
| `Badge`                             | Short status pill: host, ready, player role.                     |
| `Card`                              | Elevated surface grouping related content.                       |
| `Overlay`                           | Dimmed full-screen backdrop, rendered in a portal.               |
| `Modal`                             | Dialog shell over `Overlay`: title, close control, action row.   |
| `Dialog`                            | Popup over the visible page for a designed surface of its own.   |
| `Toast`, `ToastStack`               | Transient notice and the stack it renders into.                  |
| `PlayerRow`                         | One seat in a lobby or team list, including the empty seat.      |
| `WordCard`                          | One board tile, hidden or revealed.                              |
| `Alert`                             | Page-level result of an action.                                  |
| `LoadingDots`, `Spinner`            | The ring of dots, and the inline ring for a small area.          |
| `Skeleton`, `SkeletonPlayerCard`    | Content placeholders while data loads.                           |
| `LoadingState`, `ErrorState`        | The shared presentation of a loading and a failed area.          |

`Button` variants are emphasis, not color: `primary` for the committing action, `neutral`
for the safe choice beside a committing one, `muted` for a low-emphasis action such as
Pass, `danger` for a destructive action and `cta` for the single large call to action.

## Interaction states

The states follow the design system's state matrix, and every component draws them the
same way:

- **Hover** changes fill or border color, lifts the element by 2px and grows its shadow
  by the same 2px, so the element rises from the page instead of floating over a gap. An
  icon inside a button answers too: a leading glyph grows, a trailing one slides forward.
- **Pressed** puts the element back down onto its own shadow and drops that shadow, so a
  click feels like pressing a physical key.
- An element with no elevation of its own — a text button, an icon button that is not
  filled — has no shadow to be lifted off, so it answers in a flatter register: the same
  two durations, but it grows to 105% and fades in a tint of its own color on hover, and
  shrinks to 95% when pressed.
- **Focus** is the document-wide ring from `shared/styles/base.css` — a primary outline
  with a soft glow — so focus and hover never look alike.
- **Disabled** keeps the shape and drops to the disabled fill, or to half opacity where
  there is no fill.
- **Loading** keeps the fill and the label and trails an ellipsis. The control reports
  itself busy and stops responding to clicks, but it stays in the tab order.

Timing comes from the theme and is asymmetric on purpose. The rise takes 200ms on
`--ease-pop`, which overshoots a little so the element feels springy; the press takes
75ms on `--ease-press`, because a control that answers a click late reads as broken.
Fills and colors on an element that is already on screen use `ease-out`, and the
`fade-in`, `pop-in` and `rise-in` animations belong to overlays, dialogs and notices.
Every transform sits behind `motion-safe:`, and the base layer drops the rest under
`prefers-reduced-motion`, so the color and position information survives without the
motion.

## Loading and error presentation

A feature that waits on data renders `LoadingState`, and a feature whose load failed
renders `ErrorState` with a retry handler. Both are live regions, so the outcome is
announced as well as drawn, and every screen reports the same situation the same way.
`Skeleton` and `SkeletonPlayerCard` replace a `LoadingState` only where the shape of the
incoming content is already known.

## Accessibility and motion

Keyboard focus is drawn once, by the `:focus-visible` rule in `shared/styles/base.css`,
so every control shows the same ring. `Modal` traps focus, closes on Escape, holds the
page still behind itself and returns focus to the element that opened it. An icon-only
button requires an `aria-label`.

Motion is decoration: `prefers-reduced-motion: reduce` disables animation and
transitions document-wide, and every transform-based lift is written with Tailwind's
`motion-safe:` variant, so the color and border changes still happen without it.

## Responsive rules

The layouts frame every page in a centred container that is full-width on a phone and
capped on a desktop, and the base stylesheet keeps the document from scrolling
sideways. Components size themselves from their container rather than from the
viewport, and the board keeps five columns at every width.

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
