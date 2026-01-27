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
- Tailwind CSS v4

**Key directories:**
- `/app` - Routes and layouts (App Router convention)
- `/public` - Static assets

**Path alias:** `@/*` maps to the project root

## Code Style

- TypeScript strict mode is enabled
- ESLint configured with Next.js core web vitals rules
- Tailwind CSS for styling (utility classes in JSX)
- Geist font family (loaded via next/font)
