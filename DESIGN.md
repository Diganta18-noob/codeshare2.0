# CodeShare UI Design

Date: 2026-10-26
Status: Homepage implemented. Workspace refined with a two-row header, sharing menu, accessible file navigation, calmer editor theme, responsive utility panels, and mobile drawer focus management.

## Intent

Make CodeShare feel like a polished, focused place to write code together. Visitors should understand the product immediately, create or join a room confidently, and find the workspace controls without losing focus on their code.

The user requested a better UI and asked for this design document first. The visual choices below are proposed defaults, rather than confirmed preferences.

## Existing foundation

- Next.js App Router, React, TypeScript, Tailwind CSS, and shared CSS variables.
- Inter for interface text and JetBrains Mono for code.
- A dark homepage with a room-name form, random-room action, collaboration preview, and three feature cards.
- A Monaco workspace with toolbar, file tree, output, chat, AI, history, presence, and password controls.
- GSAP animations and a shared smooth-scroll provider.

The homepage currently uses many small text sizes, several competing animated effects, and a fixed desktop viewport. Global `overflow: hidden` also means page scrolling needs careful handling. These are implementation observations; browser-based visual review is still needed.

## Visual direction

Use a restrained developer-tool aesthetic: deep charcoal surfaces, warm white text, a clear violet accent, subtle borders, and generous spacing. Keep decorative effects behind the content and use them sparingly.

The homepage can feel expressive; the workspace should feel quiet and precise. Both should share typography, buttons, focus states, spacing, and surface colors.

### Design tokens

| Role | Proposed value | Usage |
| --- | --- | --- |
| Page background | `#0B0D12` | Main canvas |
| Surface | `#12151D` | Cards and panels |
| Raised surface | `#191D28` | Menus, inputs, selected areas |
| Border | `#2A3040` | Meaningful boundaries |
| Primary text | `#F4F5F8` | Headings and important labels |
| Secondary text | `#A7AFC0` | Body copy and supporting labels |
| Muted text | `#818B9E` | Nonessential metadata |
| Accent | `#A78BFA` | Links, focus rings, selected details |
| Primary button | `#7C3AED` with white text | Main action |
| Success | `#4ADE80` | Connected and successful states |
| Warning | `#FBBF24` | Pending or limited states |
| Error | `#F87171` | Failed operations and validation |

Verify contrast in context before finalizing these values. Do not use muted text for required instructions or essential controls.

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 pixels.
- Corner radii: 8px controls, 12px cards, 16px large preview surfaces.
- Homepage content width: approximately 1200px with 24–48px desktop gutters and 20px mobile gutters.
- Body: 16px with approximately 1.6 line height. Controls: 14px. Metadata: 12px minimum where practical.
- Hero heading: fluid 40–68px, tight tracking, approximately 1.05 line height.
- Use soft shadows on floating surfaces; use borders and background differences for ordinary structure.

## Homepage

### Layout

1. **Header:** CodeShare wordmark and a small version badge on the left; Features and GitHub links on the right. Features links to the feature section on this page.
2. **Hero:** a two-column desktop composition with a clear message and room actions on the left, and a detailed editor preview on the right.
3. **Feature section:** three evenly sized cards describing live collaboration, saved rooms, and the code editor.
4. **Footer:** a quiet brand line and GitHub link.

Allow normal page scrolling at every viewport height. Do not compress content to fit one desktop screen.

### Hero content and actions

- Eyebrow: “A shared space for your next idea”.
- Heading: “Great code starts together.”
- Supporting copy: “Open a room, share the link, and code together in real time. No account or setup required.”
- Primary action: **Create a room**. This uses the existing random-room creation flow.
- Secondary entry: a visible label, **Have a room name?**, followed by the room-name input and **Join room** button. Keep direct named-room navigation available.
- Helper text: “Use a name to open an existing room or start a new one.” This reflects the current named-room auto-creation behavior.

Use one strong primary button. Keep the form visually secondary but easy to discover. A small supporting line can reinforce “No sign-up · Shareable link”. Avoid unsupported privacy, uptime, or durability guarantees.

### Editor preview

Show a deliberate sample workspace with window controls, a file tab, syntax-colored code, two labeled collaborator cursors, and a small status strip. Label it as a preview so its connection indicators cannot be mistaken for live service status.

Use a plausible code example rather than implying an actual CodeShare SDK exists. Keep the preview decorative and non-interactive; it must not look like a working editor or contain focusable fake controls. Hide purely decorative code from assistive technology and provide a short accessible description.

### Feature cards

| Title | Message |
| --- | --- |
| Better together | See collaborators’ cursors and changes as you work. |
| Pick up where you left off | Return to a saved room using its link. |
| A familiar editor | Syntax highlighting and editing tools powered by Monaco. |

Use consistent outline icons and readable descriptions. Cards are informational, so they should not have pointer cursors, 3D tilt, or button-like hover behavior.

## Workspace

Treat workspace polish as the second implementation stage, after the homepage is reviewed.

### Structure

```text
Header: brand / room identity / connection / Share
Tools: files / language / Run / output / chat / AI / more
------------------------------------------------------
Files          | Editor              | Optional panel
               |                     | Chat / AI / history
               |---------------------|
               | Optional output     |
------------------------------------------------------
Status: save or connection state / cursor / language
```

- Give room identity, Share, and Run clear visual priority.
- Group secondary actions consistently. Put less frequent actions such as download, history, and security settings in a labeled overflow menu when space is limited.
- Preserve access to every existing action, including file management, language selection, read-only sharing, lock/password settings, chat, AI, history, and shortcuts.
- Use one right-side utility panel at a time if this can be introduced without disrupting existing workflows. Preserve panel state when switching.
- Keep output below the editor. Let code retain most of the available space.
- Distinguish the active file, selected utility, unread messages, and read-only state with labels or shapes as well as color.
- Show actual connection state; only claim content is saved when the existing persistence flow confirms it.
- Keep embed mode minimal and read-only mode clearly labeled.

### Controls and panels

Use consistent button heights, separators, icon sizing, panel headers, empty states, and close controls. Icon-only buttons need accessible names and tooltips. Destructive actions must remain visually distinct from routine actions.

Chat, AI, history, and output should have readable content spacing and clear loading, empty, success, and error states. Keep existing functional behavior unless a specific interaction change is required by this design.

## Responsive behavior

| Width | Homepage | Workspace |
| --- | --- | --- |
| 1024px and above | Two-column hero; three feature cards | File tree, editor, optional utility panel |
| 768–1023px | Stacked hero; preview below actions | Collapsible file tree; utility panel must preserve useful editor width |
| Below 768px | Single column; full-width main action and form; stacked cards | Compact toolbar; file tree and utility panels open as dismissible drawers |

At 320px, all primary actions must remain visible without page-level horizontal scrolling. Code areas may scroll horizontally within their own boundaries. Use `100dvh` where a workspace needs full viewport height, with an appropriate fallback. Keep page scrolling separate from editor and panel scrolling.

## Interaction and accessibility

- Show hover, keyboard focus, pressed, selected, loading, disabled, and error states consistently.
- Aim for 44px touch targets for primary controls and mobile actions.
- Keep a visible focus indicator, logical heading structure, explicit form labels, and keyboard-operable menus.
- Disable duplicate room creation while pending. Show “Creating room…” and announce progress accessibly.
- If creation fails or the response has no valid room identifier, show an inline error and allow retry. Keep the entered room name intact.
- Copy-link feedback should say “Link copied” and reset after a short delay; announce failure if copying fails.
- Dialogs and mobile drawers need focus management, Escape dismissal, and focus restoration.
- Target WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text and meaningful control boundaries.

## Motion

Use short 150–250ms opacity and position transitions. An optional hero entrance can run once. Remove continuous blob movement, mouse-following backgrounds, character-by-character headline reveals, and logo scrambling from the proposed experience.

Respect `prefers-reduced-motion` across GSAP and CSS. Content and actions must be visible even when animation initialization fails. Native scrolling is the default; retain the smooth-scroll provider only if it does not interfere with editor, nested scrolling, or reduced-motion behavior.

## Implementation boundaries

- Retain Next.js, Tailwind, Monaco, existing routes, APIs, persistence, and Socket.IO flows.
- Reuse existing fonts and inline SVG conventions; no new component or animation dependencies are required.
- Introduce shared tokens and control styles carefully, with page-scoped styles for homepage-specific decoration.
- Do not extend the first pass into admin screens, new account flows, backend redesign, or new product features.
- Do not include fabricated testimonials, user counts, latency statistics, or service guarantees.

## Delivery order

1. Review this design direction.
2. Implement homepage hierarchy, room actions, preview, and responsive layout in `app/page.tsx` and scoped rules in `styles/globals.css`.
3. Verify room navigation, error handling, accessibility, and viewport behavior before extending shared styles.
4. Apply the approved visual system to `Toolbar`, `FileTree`, `StatusBar`, and utility panels, coordinating layout through `EditorWrapper`.
5. Check dialogs, read-only/embed modes, reduced motion, and regressions from shared styles.

## Acceptance criteria

- The homepage has one clear primary action and an explicitly labeled named-room flow.
- Create and join actions preserve existing routes and work using keyboard input.
- Creating a room exposes pending and recoverable error states.
- All homepage content remains reachable at short desktop heights and at 320, 390, 768, 1024, and 1440px widths.
- The editor preview is clearly illustrative and cannot be mistaken for live connection status.
- Essential labels are readable; decorative motion is reduced and respects user settings.
- Workspace actions remain discoverable across desktop and mobile; overlays do not trap focus or obscure their dismissal controls.
- Existing editing, sharing, file, panel, security, and view-mode behavior remains functional.
- Run TypeScript checking and a production build. Review desktop and mobile screens in a browser; distinguish any existing environment or database failures from UI regressions.

## Decisions to confirm during review

The proposed default is a dark charcoal-and-violet theme, a homepage-first implementation, and workspace polish as a second stage. The principal copy change is “Great code starts together.” These choices can be revised before implementation.
