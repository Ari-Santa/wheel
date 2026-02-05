# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run dev` - Start development server at localhost:3000
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 application using the App Router pattern with React 19.

**Stack:**
- Next.js 16 with App Router (`/app` directory)
- React 19 with Server Components as default
- TypeScript (strict mode)
- CSS Modules for component styles (`*.module.css`)

**Key directories:**
- `/app` - Routes and layouts (App Router convention)
- `/public` - Static assets

**Path alias:** `@/*` maps to the project root

## Code Style

- TypeScript strict mode is enabled
- ESLint configured with Next.js core web vitals rules
- CSS Modules for styling (scoped component styles in `*.module.css` files)
- Global CSS in `app/globals.css` for design tokens, animations, and shared utilities
- Geist font family (loaded via next/font)

## Workflow Orchestration

### Plan Mode
Start non-trivial tasks with `EnterPlanMode` to explore the codebase and design an approach before implementation. Exit with `ExitPlanMode` once the plan is ready for user approval.

### Subagent Strategy
- **Explore agent**: Use for codebase discovery, finding files by patterns, searching code for keywords
- **Plan agent**: Use for designing implementation strategies and identifying critical files
- **Bash agent**: Use for git operations and terminal commands
- Run independent subagents in parallel when possible to maximize efficiency

### Self-Improvement Loop
After completing tasks, record insights and lessons learned in the auto memory directory (`/home/mario/.claude/projects/-home-mario-wheel/memory/`). Update `MEMORY.md` with:
- Problem constraints and gotchas
- Strategies that worked or failed
- Patterns specific to this codebase

### Verification
Always verify changes work as expected:
- Run `npm run lint` after code changes
- Run `npm run build` to catch type errors
- Test functionality manually with `npm run dev` when appropriate

### Elegance
- Prefer simple, focused solutions over over-engineered ones
- Only make changes that are directly requested or clearly necessary
- Keep code DRY but avoid premature abstractions

## Task Management

Use the task system for complex multi-step work:
- [ ] Create tasks with clear, actionable subjects
- [ ] Mark tasks `in_progress` before starting work
- [ ] Mark tasks `completed` only when fully done
- [ ] Use `TaskList` to find the next available task

## Core Principles

1. **Read before writing** - Never modify code you haven't read
2. **Minimal changes** - Only change what's necessary
3. **No guessing** - Ask questions when requirements are unclear
4. **Verify work** - Run linting and builds after changes
5. **Document learnings** - Update memory files with insights