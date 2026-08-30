# Data Model: FastImage Promotional Website

The page is static and has no persisted application data. These entities describe the content
contracts that are rendered in HTML and checked by the validation script.

## Release Entry

Represents one public FastImage release.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `version` | string | yes | Semver-like `vX.Y.Z`, unique in the catalog |
| `tag` | string | yes | Exact GitHub tag used by the notes URL |
| `dateLabel` | string | yes | Human-readable publication date; ISO date is preferred in markup |
| `status` | enum | yes | `current` or `archived`; exactly one entry is `current` |
| `highlights` | list of strings | yes | At least one accurate change summary |
| `packages` | list | yes | At least one package; only publicly verified assets |
| `notesUrl` | HTTPS URL | yes | Must target the matching GitHub release tag |

### Package

| Field | Type | Required | Validation |
|---|---|---:|---|
| `type` | enum | yes | `Setup` or `Portable` |
| `platform` | string | yes | `Windows x64` |
| `fileName` | string | yes | Must match the public asset filename |
| `downloadUrl` | HTTPS URL | yes | Must target `releases/download/<tag>/<fileName>` |
| `sizeLabel` | string | no | Display-only size if verified; may be omitted |

## Feature Story

Represents a user-facing product capability.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `eyebrow` | string | no | Short label or icon name |
| `title` | string | yes | Clear benefit-led title |
| `body` | string | yes | One concise explanation grounded in the app README |
| `visual` | enum | yes | Maps to a CSS-only visual cue; no external image required |
| `tone` | enum | yes | Maps to a design-system accent token |

## Download Action

Represents a link exposed to the visitor.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `label` | string | yes | Names version and package type where ambiguity is possible |
| `href` | HTTPS URL | yes | Must resolve to a release note or verified asset |
| `kind` | enum | yes | `primary`, `secondary`, `notes`, or `source` |
| `recommended` | boolean | yes | True only for current release's primary action |

## Relationships and Invariants

- One page contains many `Feature Story` records and seven `Release Entry` records.
- One `Release Entry` contains one or more `Package` records and exactly one `notesUrl`.
- A `Download Action` points to either a `Package.downloadUrl` or a `Release Entry.notesUrl`.
- The current release is v2.0.6 at implementation time; changing it requires updating the catalog,
  hero CTA, visible badge, and validation expectations together.
- Missing package types are absent from the markup rather than represented as disabled fake links.
