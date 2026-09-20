## Description
Implement the Privacy Policy and Terms of Service pages.

These are subject-mandatory. Their absence is an automatic-rejection risk, not a polish item.

## Tasks

* `/privacy` route with the privacy policy content.
* `/terms` route with the terms of service content.
* Both publicly accessible, with no session required.
* Footer links present on every layout, public and authenticated.
* Responsive, readable layout for long-form text.

## Rules

* Static content. There is no Bruno contract behind these pages and none is needed.
* The footer already exists at `src/layouts/Footer.tsx` and is rendered by all three layouts; this issue fills in the content and styling.

## Acceptance Criteria

* Both routes load while logged out.
* Both routes are linked from the footer on the public, lobby and game layouts.
* Content is readable at mobile width with no horizontal scrolling.
* Headings form a correct document outline for assistive technology.

## Dependencies

None. Can proceed in parallel.
