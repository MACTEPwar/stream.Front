# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository (`stream.Front`).

## Architecture

- SPA (single-page application) — no SSR, no server-rendered pages.
- Angular, latest stable major version. When scaffolding or upgrading dependencies, target the current latest release rather than pinning to an older major.
- Desktop/mobile builds wrap this same app with Electron — avoid platform-specific forks; keep one codebase.

## Design source

UI is driven from Figma exports in the umbrella repo (`steramer.io/docs/figma/*.json`, indexed in `steramer.io/figma.md`), not from guessing layout/spacing/colors.
