# Website Contract: FastImage Promotional Page

This is a document and link contract, not a server API. The site must remain valid when served as
static files or opened from a local static server.

## Required document landmarks

The page MUST contain, in order:

1. A skip link targeting `#main-content`.
2. A header with a brand link and navigation links to `#features`, `#experience`, `#releases`, and
   `#faq`.
3. A main element with `id="main-content"`.
4. A hero section with an `h1`, developer credit `Lebi_Cybereun`, Windows context, and a primary
   v2.0.6 download action.
5. A feature section with six or more capability explanations.
6. A release section with seven v2.0.x entries and exact package links.
7. A FAQ section with native disclosure controls.
8. A footer containing developer identity, source/release links, and the local-first privacy note.

## Release URL contract

All package links MUST follow:

```text
https://github.com/cybereun/FastImageViewer/releases/download/<tag>/<asset-name>
```

Release note links MUST follow:

```text
https://github.com/cybereun/FastImageViewer/releases/tag/<tag>
```

The catalog must include:

- `v2.0.6`: Portable and Setup
- `v2.0.5` through `v2.0.0`: Portable

## Progressive-enhancement contract

- Core copy and all release links are present in the HTML before JavaScript runs.
- Mobile navigation is a button enhancement with an accessible name and `aria-expanded` state.
- Release filters never remove the only way to reach releases when scripts are disabled.
- Reveal effects are cosmetic and disabled under `prefers-reduced-motion: reduce`.
- Every interactive element has a visible keyboard focus state.

## Content contract

The page may use persuasive copy, but it MUST NOT claim cloud sync, image uploads, code signing, or
package availability that the desktop app/release inventory does not provide.
