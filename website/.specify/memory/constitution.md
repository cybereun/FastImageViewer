<!--
Sync Impact Report
- Version change: template → 1.0.0 (new project constitution)
- Modified principles: all five template principles replaced with landing-page-specific rules
- Added sections: Product and technical constraints; Delivery and quality gates
- Removed sections: none
- Templates requiring updates: ✅ plan-template.md reviewed; ✅ spec-template.md reviewed;
  ✅ tasks-template.md reviewed
- Follow-up TODOs: none
-->

# FastImage Promotional Website Constitution

## Core Principles

### I. Conversion-First Product Story

The site MUST explain FastImage in the order a new visitor needs: what it is, why it is
trustworthy, what it can do, and how to download it. The first viewport MUST contain a clear
product promise and a primary Windows download action. Every major section MUST support either
understanding the product or reaching a release download; decorative content must not compete
with those actions.

### II. Bright, Accessible, Responsive Craft

The visual system MUST use a bright, high-contrast palette, readable type, visible focus states,
semantic landmarks, keyboard-operable controls, and reduced-motion support. The layout MUST remain
usable on narrow mobile screens, standard laptop screens, and wide desktop screens without relying
on hover-only interactions. Visual polish is a quality requirement, but it MUST not reduce clarity
or accessibility.

### III. Static-First, Privacy-Respecting Delivery

The promotional site MUST run as plain static assets without a server, account, database, or
tracking dependency. It MUST not imply that FastImage uploads image data: the product story must
accurately communicate its local-first behavior. Release downloads and notes MUST use explicit
HTTPS GitHub URLs so the page can be hosted on GitHub Pages or another static host without a
runtime API dependency.

### IV. Fast First Paint and Progressive Enhancement

The initial page MUST load without external font, image, or JavaScript-library dependencies. CSS
and HTML MUST provide the complete readable experience before JavaScript runs. JavaScript may add
navigation, filtering, and reveal effects, but those enhancements MUST fail safely and honor
`prefers-reduced-motion`. Unnecessary assets, layout shifts, and heavy effects are prohibited.

### V. Release Truth and Verifiable Delivery

Each release shown on the site MUST identify its version, platform, package type, and release-note
destination. Download buttons MUST point to real public assets; unavailable package types MUST be
omitted rather than faked. Any content or link change MUST be checked with a repeatable local
validation command and documented in the site README. The site source and the desktop app remain
separate so marketing changes cannot silently alter the application.

## Product and Technical Constraints

- The audience is Windows users evaluating and downloading FastImage.
- The site language is Korean-first with the FastImage brand and common package terms in English.
- The credited developer is `Lebi_Cybereun`.
- The implementation uses semantic HTML, standalone CSS, and dependency-free browser JavaScript.
- The current recommended release is v2.0.6. Older public v2.0.x releases remain discoverable.
- Image processing claims MUST stay consistent with the desktop app: local-first processing,
  Windows support, thumbnail browsing, organization, viewer/editing, and safe updates.

## Delivery and Quality Gates

- A feature is not complete until its relevant HTML, CSS, and JavaScript can be served locally.
- A release entry is not complete until its URL shape and package filename match the public GitHub
  release asset inventory.
- Responsive behavior MUST be checked at mobile, tablet/laptop, and wide desktop widths.
- The final handoff MUST state the absolute site path, the local preview command, validation results,
  and any action intentionally left for the user, such as public deployment or Git push.

## Governance

This constitution governs the promotional website and overrides convenience-based implementation
choices when they conflict with its principles. Amendments require an update to this file, a new
semantic version, and a short Sync Impact Report. Every implementation plan and final review MUST
check the five core principles and record any justified exception. Major or minor changes require
review of the site specification and task list; patch changes may update wording or links only.

**Version**: 1.0.0 | **Ratified**: 2026-08-30 | **Last Amended**: 2026-08-30
