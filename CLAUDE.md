# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online platform to play games and compete for the highest score. The repo is currently a fresh `create-next-app` scaffold (only `app/layout.tsx` and `app/page.tsx`); real features are still to be built.

Development follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install with `npx skills@latest add Klerith/fernando-skills`). Write or update a spec before implementing a feature. The README is in Spanish.

No test framework is set up yet.

## Stack and conventions

- **Next.js 16.3 (App Router, `app/` dir) + React 19.2.** APIs differ from older Next.js. Check `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, `index.md`) before using any Next API. For example, route-typed globals like `LayoutProps<"/">` are used instead of hand-written prop types.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. There is no `tailwind.config.*`. `app/globals.css` is the global theme, ported 1:1 from `references/templates/styles.css` (dark-only retro neon, no light mode). Tailwind is imported **without preflight** (only `theme.css` + `utilities.css`) so the original look is preserved; theme classes (`.btn`, `.card`, `.av-*`...) live in `@layer components` and CSS vars (`--bg`, `--cyan`, `--pixel`...) on `:root`, also exposed as Tailwind tokens under `@theme inline` (`text-cyan`, `bg-bg-2`, `font-pixel`...).
- Fonts: Press Start 2P, JetBrains Mono and Courier Prime via `next/font/google` in `app/layout.tsx`, consumed through `--pixel` / `--mono`. The layout renders `.av-bg`, `.av-noise` and `#root` like the reference HTML.
- TypeScript strict mode. Import alias `@/*` maps to the repo root.

## Slills
Usa siempre /frontend-design para diseñar la interfaz del usuario.

