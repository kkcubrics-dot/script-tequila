# Script Tequila PRD

## Product Summary

Script Tequila is a local-first screenplay development workspace for writers who want one place to keep project context, scene notes, and AI-assisted rewrites. The product should feel like a focused writing desk, not a generic chatbot.

## Problem

Screenwriting work is fragmented across notes, outlines, chat transcripts, and model settings. Writers need AI assistance that understands the current project and note without forcing them to repeatedly paste context.

## Target Users

- Solo screenwriters developing premises, scenes, and dialogue passes.
- Small writing teams that need a lightweight local prototype before adopting hosted collaboration.
- Producers or script editors doing quick beat, pacing, and character feedback passes.

## Goals

- Let a writer create projects and notes quickly.
- Keep high-level project context attached to every AI request.
- Show immediate drafting signals such as word count and estimated read time.
- Provide reusable screenplay-specific prompts for common tasks.
- Persist all project, note, settings, and chat state locally.

## Non-Goals

- Real-time collaboration.
- Full screenplay formatting and pagination.
- Cloud sync, auth, billing, or account management.
- Vendor-specific LLM SDK integration.

## MVP Scope

### Project Workspace

- User can create and switch projects.
- User can edit a project brief with logline, genre, tone, and target length.
- Project brief is saved locally and included in AI context.

### Notes

- User can create and switch notes within the active project.
- User can edit title and body content.
- Note changes can be saved manually and on blur.
- Workspace shows word count, character count, and estimated read time.

### AI Copilot

- User can chat with an OpenAI-compatible model.
- User can choose whether to include the current note in context.
- User can trigger preset requests for rewrite, beat analysis, dialogue polish, and stakes/tension.
- User receives a clear missing-key message when credentials are absent.

### Settings

- User can set provider label, model, base URL, API key, and system prompt.
- Settings persist to local JSON storage.

## UX Principles

- The first screen is the working app, not a landing page.
- The editor remains the visual center of gravity.
- Controls should be compact, predictable, and specific to writing workflows.
- System state should be visible through short status text.

## Success Metrics

- A new user can create a project, write a note, save it, and ask for AI feedback in under two minutes.
- The app can be used without an API key for local drafting.
- Type checking and production build pass.

    72|## Implementation Plan
    73|
    74|1. Extend the project model with screenplay brief fields.
    75|2. Add backward-compatible state normalization for existing JSON data.
    76|3. Add editable project brief controls to the workspace.
    77|4. Add draft metrics derived from the active note.
    78|5. Add quick prompt buttons that fill the chat composer.
    79|6. Refresh visual styling for a more focused writing interface.
    80|7. Verify with `npm run typecheck` and `npm run build`.
    81|
    82|## Future Features (Backlog)
    83|
    84|- AI生图辅助工具：实现基于选定图片或画板区域的提示词生成。
    85|  - Reference: http://xhslink.com/o/3mtx6ydKvRC
    86|
