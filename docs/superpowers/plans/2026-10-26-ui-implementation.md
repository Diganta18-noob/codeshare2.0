# Animated UI Implementation Plan

> Execute inline using superpowers:executing-plans, with verification before completion.

**Goal:** Implement the approved charcoal-and-violet UI with restrained, accessible motion.
**Architecture:** Keep the existing Next.js routes and room flows. Replace the homepage composition, scope its visual styles, and refine shared workspace surfaces without changing editor state management.
**Tech stack:** React, TypeScript, Tailwind, CSS animations, existing GSAP.
**Spec:** `DESIGN.md`.

## Constraints

No new runtime dependencies. Preserve all room and editor capabilities. Respect reduced motion. Do not invent live status or product metrics.

## Tasks

- [x] Rebuild `app/page.tsx` with semantic navigation, clear create/join actions, pending/error handling, a decorative syntax-colored preview, and feature cards.
- [x] Add scoped homepage CSS, responsive layouts, focus indicators, and staggered entrance animations in `styles/globals.css`.
- [x] Refine shared theme tokens and workspace surfaces; remove toolbar logo scrambling and respect reduced motion in touched animation code.
- [x] Restore native homepage scrolling and retain independent editor scrolling.
- [x] Run TypeScript and production build checks; review the homepage at mobile and desktop sizes and exercise room creation failures and named-room navigation where tooling permits.

## Review focus

- A slow or failed create request must expose feedback and allow retry.
- Long room names and narrow screens must not cause page-level horizontal overflow.
- Decorative previews must not claim actual connection status.
- Reduced-motion mode must leave content visible and usable.
- Global token changes must preserve workspace text contrast and control boundaries.

## Verification record

- Standalone TypeScript check passed (`tsc --noEmit --incremental false`). The repository's Next configuration skips type validation, so this was run separately.
- Production build passed after the initial implementation; final build repeated after review fixes.
- Browser checked at 320, 390, 768, 1024, and 1440px: homepage scroll width equals its client width.
- Room creation returned HTTP 201 and opened the editor. The pending state disabled duplicate submissions.
- Named-room navigation encoded a room name containing a space correctly.
- Editor and chat panel rendered successfully in browser review.
- Independent review found a chat-send icon contrast regression; darkened its button background and hover state.
- Reduced-motion handling reviewed in CSS and the shared GSAP matchMedia hook; OS preference switching was not exercised.
- Failed-create recovery was implemented but not forced in the connected browser session.
- Existing workspace drawer focus management and a broader workspace reorganization remain outside this visual implementation.