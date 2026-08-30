# Quickstart: FastImage Promotional Website

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7.
- A modern browser.
- Optional: Python 3 or Node.js for a local static server.

## Preview locally

From `L:\Codex-L\fast-image\website` run one of:

```powershell
py -m http.server 4173
```

or:

```powershell
npx --yes serve . -l 4173
```

Open `http://127.0.0.1:4173/` in a browser. Stop the server with `Ctrl+C`.

## Repeatable validation

```powershell
.\scripts\validate-site.ps1
```

Expected result: the script reports PASS for required files, landmarks, developer credit, current
release, all seven release tags, exact package filenames, HTTPS-only external links, and the
absence of remote runtime assets.

## Manual smoke checks

1. Load the page at 360px, 768px, and 1440px widths; confirm no horizontal scrollbar appears.
2. Use `Tab` from the top; confirm the skip link, navigation, downloads, filters, FAQ, and footer
   links have a visible focus ring and sensible order.
3. Disable JavaScript; confirm hero copy, feature cards, FAQ text, and every release link remain
   available. The release filter controls may be inert in this mode.
4. Enable the operating system's reduced-motion preference; confirm reveal and decorative motion do
   not animate distractingly.
5. Activate the v2.0.6 Setup and Portable buttons and confirm each opens the corresponding public
   GitHub asset URL.

## Updating a release

When a new public GitHub Release is available, update the current-release hero metadata and the
release catalog together. Run `gh api repos/cybereun/FastImageViewer/releases?per_page=20` to verify
the asset inventory, update `scripts/validate-site.ps1`, then repeat the quickstart checks.
