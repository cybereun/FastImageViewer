# Tasks: FastImage Promotional Website

**Input**: Design documents from `specs/001-fastimage-promo-site/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/website-contract.md`,
and `quickstart.md`

**Tests**: Validation and smoke-test tasks are included because release URLs, accessibility, and
progressive enhancement are explicit acceptance requirements.

## Phase 1: Setup

**Purpose**: Establish the static site surface without coupling it to the Electron app.

- [X] T001 [P] Add `.gitignore` entries for local server logs and generated preview output
- [X] T002 Create the static site entry files `index.html`, `styles.css`, and `script.js`
- [X] T003 [P] Create the site guide at `README.md` with preview, editing, and hosting instructions
- [X] T004 [P] Create the repeatable validation script at `scripts/validate-site.ps1`

---

## Phase 2: Foundational

**Purpose**: Establish the shared design system, content shell, and verified release-link rules that
all user stories depend on.

- [X] T005 Define bright color tokens, typography scale, spacing, focus states, responsive breakpoints,
  reduced-motion behavior, and reusable surface styles in `styles.css`
- [X] T006 Add document metadata, skip link, semantic header/navigation, main landmark, and footer
  anchors in `index.html`
- [X] T007 Add the verified v2.0.0–v2.0.6 release URL inventory and package labels to `index.html`
- [X] T008 Add accessible baseline behavior and no-JavaScript-safe markup for navigation, release
  links, FAQ, and enhanced controls in `index.html` and `script.js`

**Checkpoint**: The page has a valid semantic shell and all core static content can be rendered
before user-story polish is applied.

---

## Phase 3: User Story 1 - Understand and download FastImage (Priority: P1) 🎯 MVP

**Goal**: A first-time Windows visitor understands FastImage, sees `Lebi_Cybereun`, and reaches the
recommended v2.0.6 package from the first viewport.

**Independent Test**: Open `index.html` at a 1366×768 viewport, identify the product, developer,
Windows context, and current release, then activate both recommended download links.

### Implementation for User Story 1

- [X] T009 [US1] Build the hero headline, product promise, developer credit, Windows status, and
  primary/secondary v2.0.6 download actions in `index.html`
- [X] T010 [US1] Build the CSS-only FastImage workspace preview with sidebar, thumbnail grid, search,
  and version footer in `index.html` and `styles.css`
- [X] T011 [US1] Add hero trust metrics and the local-first privacy statement in `index.html`
- [X] T012 [US1] Add hero navigation and CTA focus/hover/pressed states in `styles.css` and `script.js`

**Checkpoint**: User Story 1 is independently demoable from the hero and its direct GitHub links.

---

## Phase 4: User Story 2 - Evaluate product value and trust (Priority: P2)

**Goal**: A visitor can scan the product capabilities, privacy/update model, and FAQ without needing
technical knowledge.

**Independent Test**: Ignore the release catalog and verify that the feature story explains six-plus
capabilities, local processing, supported workflow, and update behavior.

### Implementation for User Story 2

- [X] T013 [P] [US2] Add the bento-style feature grid for navigation, thumbnails, search, organization,
  viewer/editing, and safe updates in `index.html`
- [X] T014 [P] [US2] Add the workflow/explanation section with local-first, format, and Windows
  compatibility details in `index.html` and `styles.css`
- [X] T015 [US2] Add native FAQ disclosure items and the no-cloud-upload explanation in `index.html`
- [X] T016 [US2] Add supporting feature visual cues and responsive card layouts in `styles.css`

**Checkpoint**: User Story 2 is independently understandable with JavaScript disabled.

---

## Phase 5: User Story 3 - Compare releases and package types (Priority: P3)

**Goal**: A returning user can inspect seven release entries, distinguish Setup from Portable, and
  open matching release notes.

**Independent Test**: Scroll to the release catalog, verify all seven v2.0.x entries and their links,
  then use the enhanced filter controls without losing access to release notes.

### Implementation for User Story 3

- [X] T017 [US3] Render the v2.0.6 recommended release card with Setup and Portable downloads and a
  matching release-notes link in `index.html`
- [X] T018 [US3] Render v2.0.5 through v2.0.0 archived release cards with only their verified Portable
  assets and matching release-notes links in `index.html`
- [X] T019 [US3] Add release filter buttons, result count, and accessible active state enhancement in
  `index.html` and `script.js`
- [X] T020 [US3] Add release card, package badge, notes link, and empty/filter fallback styles in
  `styles.css`

**Checkpoint**: User Story 3 is independently usable from static HTML and enhanced filtering.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Complete interactions, documentation, verification, and quality gates across all stories.

- [X] T021 [P] Implement mobile menu toggle, escape-to-close behavior, outside-click close, reveal
  observer, and reduced-motion guard in `script.js`
- [X] T022 [P] Add responsive breakpoints, print-safe fallback, and browser-safe decorative styling
  refinements in `styles.css`
- [X] T023 [P] Add validation assertions for required landmarks, developer credit, release tags,
  exact asset filenames, HTTPS links, and no remote runtime assets in `scripts/validate-site.ps1`
- [X] T024 Document local preview, release update procedure, static hosting guidance, and verified
  scope in `README.md`
- [X] T025 Run `scripts/validate-site.ps1`, serve the site locally, and record manual responsive,
  keyboard, JavaScript-disabled, and reduced-motion results in `README.md`
- [X] T026 Update the parent app documentation with a link to the promotional site in `../README.md`
- [X] T027 Keep the initial desktop fold focused on the hero, add a scroll cue, and document the
  post-scroll content behavior in `index.html`, `styles.css`, `README.md`, and the feature artifacts

## Dependencies and Execution Order

### Phase Dependencies

- Setup (T001–T004) has no dependencies and establishes the files.
- Foundational work (T005–T008) depends on setup and blocks all user stories.
- User Story 1 (T009–T012) depends on the foundational shell and is the MVP.
- User Story 2 (T013–T016) depends on the shared design tokens but can be completed independently
  after the foundation.
- User Story 3 (T017–T020) depends on the release inventory and shared card styles.
- Polish (T021–T026) depends on the desired user stories being present.

### User Story Dependencies

- **US1**: No dependency on another story after Phase 2.
- **US2**: No functional dependency on US1 content after Phase 2.
- **US3**: No functional dependency on US2 content after Phase 2.

### Parallel Opportunities

- T001, T003, and T004 can run in parallel after project initialization.
- T013 and T014 can run in parallel because they touch different content/style concerns.
- T021, T022, T023, and T024 can run in parallel after the story work is present.

## Implementation Strategy

### MVP First

1. Complete T001–T008.
2. Complete T009–T012 for the hero and recommended download.
3. Run the independent US1 test and the link validator.

### Incremental Delivery

1. Add US2 feature and trust content, then verify with JavaScript disabled.
2. Add US3 release catalog and filters, then verify every package target.
3. Complete cross-cutting polish and the full quickstart checklist.

### Format Validation

All tasks use a checkbox, sequential `T###` ID, optional `[P]` marker, required story marker in
user-story phases, and an exact file path in the description.
