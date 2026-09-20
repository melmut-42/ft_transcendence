## Description
Apply the design system and responsive UI foundations across the app.

## Tasks

* Design tokens (`src/shared/styles/tokens.css`), extended as needed.
* Typography scale.
* Spacing scale.
* Reusable primitives in `shared/ui`: button, input, avatar, badge, card, modal shell, toast, overlay, player row, word card.
* Responsive rules for the layouts and the game board.
* Accessibility states.
* Focus states.
* Loading and error presentation, consistent across features.

## Rules

* Styling is CSS custom properties plus component-scoped CSS, colocated with each component. No CSS framework replaces the hand-built system.
* The palette, radius and shadow tokens come from `ui-design/styles.css` and are already in `tokens.css`. Components consume tokens and never define raw colour values.
* Use the `ui-design` branch as visual guidance only.
* **The mockups are a visual reference, not a behavioral contract.** Build only what the contract defines. In particular, do not build: a host "START PARTY" button, a room-name field, a fixed "4/8" capacity display, a Classic/Blitz mode selector, a game timer, a guest-nickname screen, room codes outside `^[A-Z0-9]{6}$`, a "Forgot password?" link, or a leave-confirmation modal implying lost progress (leaving during a game succeeds and forfeits — say that).
* A component starts feature-local and moves to `shared/ui` once a second feature needs it.

## Acceptance Criteria

* No hardcoded colour, spacing or radius values outside `tokens.css`.
* Every interactive element has a visible keyboard focus state.
* Layouts work down to mobile width with no horizontal page scroll.
* Loading and error presentation is consistent across features.
* `prefers-reduced-motion` is respected.

## Dependencies

None. Can proceed in parallel with most feature work.
