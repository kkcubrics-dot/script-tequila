# Frontend Refactor Phase 0 Audit

Date: 2026-05-08
Scope: Script Tequila Web workspace (`components/workspace*`, `app/globals.css`)

## 1) Current Architecture Snapshot

- Frontend framework: Next.js App Router + React 18
- Main container: `components/workspace.tsx`
- Main feature panes:
  - `components/workspace/top-bar.tsx`
  - `components/workspace/sidebar-pane.tsx`
  - `components/workspace/note-pane.tsx`
  - `components/workspace/chat-pane.tsx`
- Style source: global CSS in `app/globals.css` with dense class-based styling

## 2) Coupling Hotspots

- `workspace.tsx` previously contained both orchestration logic and user-prompt UI control (`window.prompt` for create/rename/move note).
- Layout mode, note state, chat state, and modal state share one container; this raises regression risk when changing layout.
- Pane action signatures are relatively clean, but action UX parity was inconsistent (inline input + browser prompt + floating settings form).

## 3) Interaction Gaps (Before Refactor)

- Blocking native prompts disrupted flow and were hard to style/accessibility-tune.
- No unified dialog primitives for task-confirming actions.
- UI primitives were largely class-driven without shared composable component contracts.

## 4) Phase 1 Foundation Decisions

- Adopt shadcn-style primitives as interaction base layer:
  - `Button`, `Input`, `Dialog`
- Keep business component naming and ownership (`workspace/*`) intact.
- Replace blocking prompt flows first to reduce UX risk with minimal API behavior change.

## 5) Completed in This Pass

- Added utility function:
  - `lib/utils.ts` (`cn` helper)
- Added UI primitives:
  - `components/ui/button.tsx`
  - `components/ui/input.tsx`
  - `components/ui/dialog.tsx`
- Added reusable note action dialog:
  - `components/workspace/note-action-dialog.tsx`
- Refactored note actions in `workspace.tsx`:
  - removed `window.prompt` for create/rename/move
  - unified to typed modal action flow with async submit handling

## 6) Risk Log (Updated)

- Remaining high-coupling area: `workspace.tsx` still carries wide state surface.
- Remaining visual consistency task: many legacy button classes are still in use.
- Remaining flow consistency task: settings panel still uses a custom floating form, not dialog primitives.

## 7) Next Execution Slice

- Phase 2: split layout shell concerns from domain actions where safe.
- Phase 3: migrate `TopBar` and `SidebarPane` action controls to primitive-driven components for consistency.
- Phase 4 gate: run `typecheck + build`, then do manual flow regression.
