# Research: FastImage Promotional Website

**Date**: 2026-08-30

## Decision 1: Use useful 2026 visual patterns, not trend-only decoration

**Decision**: Use a modular bento-like feature rhythm, expressive headline scale, soft mesh
gradients, tactile surfaces, and small motion cues. Keep the page bright and calm so the download
path remains obvious. Motion will be optional and honor reduced-motion preferences.

**Rationale**: Current 2026 design coverage repeatedly points to bento layouts, expressive type,
subtle gradients, motion with purpose, accessibility, and performance-first delivery. Those signals
fit a desktop utility: the layout can demonstrate organization while the static content remains
fast and readable.

**Alternatives considered**:

- Full-screen 3D/WebGL: rejected because it adds loading cost and distracts from a Windows download.
- Dark-only cyberpunk styling: rejected because the user explicitly requested bright colors and it
  can reduce approachability for a utility product.
- Flat card grid with no visual rhythm: rejected because it would not communicate the requested
  premium, expert-made impression as effectively.

**References**:

- [Figma — Top Web Design Trends for 2026](https://www.figma.com/resource-library/web-design-trends/)
- [Adfirm — Bento grids and motion-first layouts](https://www.adfirm.net/blog/bento-grids-motion-first-2026/)
- [Studio Meyer — Web Design Trends 2026](https://studiomeyer.io/en/blog/webdesign-trends-2026)

## Decision 2: Dependency-free static architecture

**Decision**: Use semantic HTML, standalone CSS, and small browser JavaScript. Do not add a frontend
framework, remote font, image CDN, analytics package, or release API.

**Rationale**: A promotional page has low data complexity. Static files make first render reliable,
preserve the download experience when JavaScript fails, and allow the page to be hosted on a simple
static service. The existing desktop app's dependency graph should not be coupled to marketing UI.

**Alternatives considered**:

- Add React/Vite as a second frontend: rejected because it increases build and deployment surface
  without providing value for one mostly-static page.
- Fetch GitHub releases at runtime: rejected because a CORS/network failure would make release
  discovery brittle; release URLs are curated and validated instead.

## Decision 3: Release links are curated from the public asset inventory

**Decision**: Show v2.0.0 through v2.0.6. Mark v2.0.6 as current and expose Setup plus Portable;
  expose only Portable for v2.0.0–v2.0.5 because those are the assets currently published.

**Rationale**: The user asked for release-by-release downloads. Linking exact assets avoids 404s
caused by guessed filenames and is transparent about package availability.

**Verified inventory on 2026-08-30**:

| Release | Public assets |
|---|---|
| v2.0.6 | `FastImage-2.0.6-Windows-Portable.exe`, `FastImage-2.0.6-Windows-Setup.exe` |
| v2.0.5 | `FastImage-2.0.5-Windows-Portable.exe` |
| v2.0.4 | `FastImage-2.0.4-Windows-Portable.exe` |
| v2.0.3 | `FastImage-2.0.3-Windows-Portable.exe` |
| v2.0.2 | `FastImage-2.0.2-Windows-Portable.exe` |
| v2.0.1 | `FastImage-2.0.1-Windows-Portable.exe` |
| v2.0.0 | `FastImage-2.0.0-Windows-Portable.exe` |

**Source**: `gh api repos/cybereun/FastImageViewer/releases?per_page=20` queried during planning.
