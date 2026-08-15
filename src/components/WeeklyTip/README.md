# WeeklyTip Component

Shows one age-appropriate development/care tip for the baby, sourced from official national health authorities and midwife bodies (currently NHS UK, Santé publique France, AEPED Spain, and Sundhedsstyrelsen Denmark, among others) rather than blogs or generic parenting content.

## Features

- Automatically selects the tip matching the selected baby's current age
- Left/right arrows let a caregiver browse tips from earlier or later days/weeks; arrows disable at the edges of the currently-authored content
- After a tip has been shown once, it re-displays folded to just its headline on later visits (tracked per-browser via `localStorage`); tapping the headline expands/collapses it again
- The family's **Tip Frequency** setting (Settings → Baby Tips) controls whether only the weekly headline tips are reachable, or every daily tip in between
- Every tip links back to its original source page for verification
- Renders nothing if the baby has no birth date, or if their current age falls outside the currently-covered range

## Usage

```tsx
import WeeklyTip from '@/src/components/WeeklyTip';

const MyComponent = () => {
  const { selectedBaby } = useBaby();
  return <WeeklyTip baby={selectedBaby} frequency={settings?.tipFrequency ?? 'weekly'} />;
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `baby` | `Baby \| null \| undefined` | Yes | The currently selected baby; its `birthDate` is used to compute age in days |
| `frequency` | `'daily' \| 'weekly'` | Yes | From the family's `Settings.tipFrequency`; `'weekly'` only surfaces the headline tip for each week, `'daily'` surfaces every authored day |

## Content

Tip content lives in `src/constants/dailyTips.ts` as a static array (one entry per day, `day` = day of the baby's life), not a database model — this is fixed reference content, not per-family data. Each entry includes `sourceName`/`sourceUrl` for attribution, and `isWeeklyFeature` marks the first day of each week (the original weekly headline tips). `title` and `tip` text are used directly as localization keys via `t()`.

**Coverage: days 1-84 (weeks 1-12) only.** Later weeks are a tracked follow-up, since each tip requires genuinely verifying a real official source rather than writing plausible-sounding guidance — see the project's GitHub issues for the tracking ticket.

## Styling

Follows the project's component pattern:
- `weekly-tip.styles.ts`: Tailwind classes
- `weekly-tip.css`: `html.dark` overrides for dark mode
- `weekly-tip.types.ts`: TypeScript prop types
