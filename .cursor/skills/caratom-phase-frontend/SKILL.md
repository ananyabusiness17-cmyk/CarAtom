---
name: caratom-phase-frontend
description: Mandatory Phase 2+ frontend lifecycle for CARATOM. Use before, during, and after every implementation phase that touches UI. Full-codebase audit against vibe-code principles, Expo/Vercel/Anthropic skills, accessibility, performance, and edge states. Do not declare a phase complete until the checklist passes and in-scope audit issues are fixed.
---

# CARATOM Phase 2+ frontend enforcement

Phase 1 of this project is already complete. Do not redo Phase 1.

From **Phase 2 onward**, every implementation decision involving the frontend must be informed by:

1. `Vibe code principles/` (highest-level product standard when it conflicts with external skills)
2. Expo mobile/native guidance (`expo-overview`, `expo-router`, `expo-native-ui`, `expo-design-system`, `expo-animation`, `expo-data-fetching`)
3. Vercel React Native and React guidance (`vercel-react-native-skills`, `vercel-react-best-practices`, `vercel-composition-patterns`)
4. Anthropic `frontend-design`
5. Admin web: `web-design-guidelines`
6. Pattern references in `caratom-design-references` (Reusables, Tamagui, NativeWind — **not** runtime installs)

Do not treat these as optional. Visual tokens and walkthrough UI live in `docs/architecture/10-design-system.md` (tasteful light-blue accent, not a page-wide tint), `docs/AUDIT-REPORT.md`, the current phase spec, and `docs/inspiration/`.

## Before the phase

Before writing code:

- Read the relevant `Vibe code principles`.
- Review the relevant external skill guidance.
- Understand the existing components and design system affected by the phase.
- Identify reusable components/patterns before creating new ones.
- Identify mobile UX considerations.
- Identify accessibility considerations.
- Identify performance considerations.

## During the phase

While implementing:

- Follow the project's `Vibe code principles`.
- Follow native mobile UX conventions.
- Follow the relevant Expo guidance.
- Follow the relevant React Native engineering guidance.
- Follow the frontend-design principles.
- Reuse the existing design system.
- Prefer reusable components over one-off implementations.
- Maintain visual consistency with the rest of the application.
- Avoid generic AI-generated UI.
- Avoid introducing unnecessary libraries or architectural changes.

Do not randomly switch between Expo, Tamagui, NativeWind, Reusables, and one-off patterns. Follow the existing architecture, then vibe-code principles, then external skills as expert references. Once a good pattern exists in the repo, reuse it.

## After the phase

This is MANDATORY. Do not declare the phase complete immediately after implementation.

First perform a **full-codebase audit**. Inspect the ENTIRE application — not just files changed in that phase.

### A. Vibe code principles

Check visual language, typography, colors, spacing, component patterns, interaction patterns, animation principles, UX principles, accessibility principles, and product-specific design rules.

### B. Mobile UX

Check touch targets, navigation, gestures, hierarchy, information density, keyboard behavior, safe areas, iOS conventions, Android conventions, responsive behavior, and native-feeling interactions.

### C. Visual quality

Check composition, hierarchy, typography, spacing, visual balance, consistency, contrast, polish, animation, and visual identity.

Look for generic AI-generated patterns such as excessive cards, rounded containers, gradients, shadows, borders, decorative elements, oversized headings, arbitrary spacing, and inconsistent icons.

### D. Component / design system quality

Check duplicated components, duplicated styling, inconsistent variants, inconsistent states, design-system drift, unnecessary one-off components, components that should be generalized, and components that were unnecessarily generalized.

### E. Accessibility

Check contrast, readable text, touch targets, labels, semantic meaning, screen-reader behavior, dynamic text, and keyboard interaction.

### F. Performance

Check unnecessary re-renders, expensive lists, unnecessary animations, unnecessary effects, image performance, navigation performance, state management, and component complexity.

### G. Edge states

Check relevant features for loading, empty, error, disabled, success, partial data, long text, small screens, large screens, keyboard open, and network failure.

## Fix the audit findings

If the audit discovers problems: do not merely report them. Fix them before declaring the phase complete, provided the fixes are within the scope of the current phase and do not break existing functionality. After fixing them, perform the relevant audit again. The phase is not complete until the obvious issues have been resolved.

A change in a later phase may expose a design inconsistency from an earlier phase. Flag it and fix it when appropriate. The application must become more consistent as development progresses, not less.

## Phase completion checklist

Every phase from Phase 2 onward must satisfy:

- [ ] Relevant vibe-code principles reviewed
- [ ] Relevant external skills reviewed
- [ ] Existing design system reviewed
- [ ] Existing components reused where appropriate
- [ ] Mobile UX reviewed
- [ ] Accessibility reviewed
- [ ] Performance reviewed
- [ ] Loading states reviewed
- [ ] Empty states reviewed
- [ ] Error states reviewed
- [ ] Edge cases reviewed
- [ ] Entire codebase visually reviewed
- [ ] Entire codebase checked for design-system consistency
- [ ] No unnecessary dependencies introduced
- [ ] No unnecessary design patterns introduced
- [ ] No generic AI UI introduced
- [ ] Audit issues fixed
- [ ] Final implementation re-checked
- [ ] Phase 8+: `pnpm security` on the entire repo (see `caratom-security-gate`)

ONLY AFTER THIS CHECKLIST IS SATISFIED may the phase be marked complete.

This rule stays in force from Phase 2 through the final phase.
