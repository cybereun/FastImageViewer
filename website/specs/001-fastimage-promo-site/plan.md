# Implementation Plan: FastImage Promotional Website

**Branch**: `001-fastimage-promo-site` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

## Summary

Create a single-page, Korean-first promotional site for FastImage in a separate `website/`
subproject. The page will use a bright pearl background, electric blue/aqua accents, expressive
headline scale, and a restrained bento-style content rhythm to communicate the product before
asking for a download. All core content and release links will work as static HTML; dependency-free
JavaScript will add a mobile menu, release filters, FAQ disclosure behavior, and subtle reveal
effects without becoming a requirement.

The release catalog will be hand-curated from the public GitHub release inventory verified on
2026-08-30. v2.0.6 will be marked as recommended and will expose both Setup and Portable assets;
older releases will expose only the package types that actually exist.

## Technical Context

**Language/Version**: HTML Living Standard, modern CSS, browser JavaScript (ES2022-compatible)

**Primary Dependencies**: None; no remote fonts, image CDNs, UI libraries, or runtime APIs

**Storage**: None; release and feature content are static page data

**Testing**: Repeatable PowerShell static assertions, local static-server smoke test, and manual
responsive/keyboard/reduced-motion checks documented in `quickstart.md`

**Target Platform**: Current Windows browsers and responsive mobile/tablet browsers; static hosts
such as GitHub Pages, Netlify, or any ordinary HTTPS file host

**Project Type**: Static web landing page

**Performance Goals**: No external network dependency for first render; core hero CTA present in the
initial document; no horizontal overflow at 360px; interactions remain lightweight and optional

**Constraints**: Korean-first copy; bright visual direction; local-first privacy claims; exact
public GitHub release links; visible focus states; `prefers-reduced-motion` support; no analytics,
account, backend, or deployment in this task

**Scale/Scope**: One responsive page, seven public v2.0.x releases, six-plus feature stories, FAQ,
footer, and a CSS-rendered app preview; no CMS or multi-page routing

## Constitution Check

*GATE: Pass before implementation and re-check after design.*

| Principle | Evidence in this plan |
|---|---|
| I. Conversion-First Product Story | Hero-first information hierarchy, current-release CTA, and release catalog are P1 scope. |
| II. Bright, Accessible, Responsive Craft | Bright palette, semantic landmarks, keyboard focus, responsive breakpoints, and reduced motion are explicit constraints. |
| III. Static-First, Privacy-Respecting Delivery | No backend or runtime API; local-first messaging; direct HTTPS GitHub links. |
| IV. Fast First Paint and Progressive Enhancement | No external assets; HTML/CSS contain the core experience; JS only enhances interaction. |
| V. Release Truth and Verifiable Delivery | Release inventory is verified against GitHub assets and checked by repeatable local assertions. |

**Gate status**: PASS. No exception or complexity justification is required.

## Phase 0: Research

Research decisions are recorded in [research.md](./research.md):

1. Translate current 2026 design signals into useful, accessible patterns rather than decorative
   effects.
2. Confirm the public GitHub release inventory and exact download filenames.
3. Select a static implementation that can be previewed without installing a second app stack.

## Phase 1: Design and Contracts

Generated artifacts:

- [data-model.md](./data-model.md) — content entities and validation rules.
- [contracts/website-contract.md](./contracts/website-contract.md) — document landmarks,
  progressive-enhancement, and release-link contract.
- [quickstart.md](./quickstart.md) — local preview and repeatable validation guide.

### Project Structure

```text
website/
├── index.html                    # Semantic landing page and release markup
├── styles.css                    # Bright responsive design system and CSS app preview
├── script.js                     # Optional navigation, filtering, reveal, and FAQ behavior
├── README.md                     # Site-specific preview, editing, and deployment notes
├── scripts/
│   └── validate-site.ps1         # Link/content/structure assertions
├── specs/001-fastimage-promo-site/
│   ├── spec.md
│   ├── plan.md
│   ├── research.md
│   ├── data-model.md
│   ├── quickstart.md
│   ├── contracts/website-contract.md
│   └── tasks.md
└── .gitignore
```

**Structure Decision**: A dependency-free single-page site at the project root keeps the public
surface easy to host and audit. Spec Kit artifacts live under `specs/`; validation scripts live in
`scripts/`. The parent Electron app remains untouched except for an optional README link.

## Phase 1 Design Decisions

- Use a skip link, semantic `header/nav/main/section/footer`, real anchors, and native `details`
  elements for baseline FAQ behavior.
- Use a large hero with a CSS-only FastImage workspace mockup so the first render has a product
  visual without relying on an untracked screenshot or remote image.
- Size the hero to the viewport below the sticky header so the first fold is intentional; keep the
  trust strip and longer product story after the fold, with an explicit scroll cue.
- Use a bento-like feature grid with varied spans, but keep content order linear and readable on
  mobile.
- Use static release data in the HTML so downloads remain available with JavaScript disabled.
- Mark the recommended release with `aria-label`, a visual badge, and both setup/portable links.
- Add a small `noscript` message only for enhanced behavior; do not hide core content when scripts
  are unavailable.

## Constitution Re-check After Design

All five principles remain satisfied. The only intentional trade-off is using decorative CSS
gradients and blur in the hero preview; they are layered behind readable content, do not affect
layout dimensions, and are disabled/reduced under `prefers-reduced-motion` where animation is used.

## Complexity Tracking

No constitution violations. No complexity entry required.
