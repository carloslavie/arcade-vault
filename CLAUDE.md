# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online platform to play games and compete for the highest score. The repo is currently a fresh `create-next-app` scaffold (only `app/layout.tsx` and `app/page.tsx`); real features are still to be built.

Development follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install with `npx skills@latest add Klerith/fernando-skills`). Write or update a spec before implementing a feature. The README is in Spanish.

## Commands

- `npm run dev`: dev server at http://localhost:3000 (it also rewrites `AGENTS.md`)
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint (flat config in `eslint.config.mjs`, using `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit`: type-check only

No test framework is set up yet.

## Stack and conventions

- **Next.js 16.3 (App Router, `app/` dir) + React 19.2.** APIs differ from older Next.js. Check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, `index.md`) before using any Next API. For example, route-typed globals like `LayoutProps<"/">` are used instead of hand-written prop types.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. There is no `tailwind.config.*`: theme tokens live in `app/globals.css` under `@theme inline`, mapped from CSS variables on `:root`. Dark mode uses `prefers-color-scheme`.
- Fonts: Geist / Geist Mono via `next/font/google`, exposed as `--font-geist-sans` / `--font-geist-mono`.
- TypeScript strict mode. Import alias `@/*` maps to the repo root.
