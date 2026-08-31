---
name: caratom-design-references
description: Read-only pattern references for React Native Reusables, Tamagui, and NativeWind. Use when designing CARATOM mobile UI to borrow interaction or token ideas. Do not install these libraries unless an ADR and two real consumers exist. Never mix them into a second design system.
---

# CARATOM design-system references (not runtime)

These repositories are **expert pattern sources**. They are not CARATOM's design system and must not be added as npm dependencies during Phase 2+ unless a documented ADR requires it and at least two apps would consume the same primitives (`docs/architecture/05-technical-architecture.md`, `06-frontend-architecture.md`).

Current mobile stack: Expo SDK 52, Expo Router, React Native `StyleSheet`. Admin web already uses Tailwind 3.4. Phase 02 introduces `packages/ui-tokens`; `packages/ui` only when two consumers exist.

## Consult (do not install)

| Source | Use for | Do not |
|--------|---------|--------|
| [React Native Reusables](https://github.com/founded-labs/react-native-reusables) | Accessible primitive structure, variants, composition | Copy the whole library or add it as a dependency |
| [Tamagui](https://github.com/tamagui/tamagui) | Token-driven variants, compiled style ideas | Add Tamagui / change the compiler |
| [NativeWind](https://github.com/nativewind/nativewind) | Utility-class thinking mapped onto **existing** tokens | Run Expo `expo-tailwind-setup` or add NativeWind to mobile apps |

## How to apply a pattern

1. Follow the existing project architecture and `Vibe code principles/`.
2. Follow the current phase spec (aligned with architecture doc 10: light-blue accent used tastefully, not everywhere).
3. If a Reusables/Tamagui/NativeWind idea is useful, reimplement it with the project's tokens and StyleSheet (mobile) or Tailwind (admin web only).
4. Prefer reusing a pattern already in this repo over introducing an alternative.

## Forbidden without ADR

- `tamagui`, `@tamagui/*`
- `nativewind`, `react-native-css`
- `react-native-reusables` or cloning those repos into `apps/` or `packages/`

Expo skill `expo-tailwind-setup` is **not** installed on purpose. Do not execute it.
