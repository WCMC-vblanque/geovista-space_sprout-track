# WeeklyTip Component

Shows one age-appropriate development/care tip per week of the baby's life, sourced from official national health authorities and midwife bodies (currently NHS UK, Santé publique France, AEPED Spain, and Sundhedsstyrelsen Denmark) rather than blogs or generic parenting content.

## Features

- Automatically selects the tip matching the selected baby's current age in weeks
- Every tip links back to its original source page for verification
- Renders nothing if the baby has no birth date, or if their current age falls outside the currently-covered range

## Usage

```tsx
import WeeklyTip from '@/src/components/WeeklyTip';

const MyComponent = () => {
  const { selectedBaby } = useBaby();
  return <WeeklyTip baby={selectedBaby} />;
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `baby` | `Baby \| null \| undefined` | Yes | The currently selected baby; its `birthDate` is used to compute age in weeks |

## Content

Tip content lives in `src/constants/weeklyTips.ts` as a static array (one entry per week), not a database model — this is fixed reference content, not per-family data. Each entry includes `sourceName`/`sourceUrl` for attribution. `title` and `tip` text are used directly as localization keys via `t()`.

**Coverage: weeks 1-12 only** (first three months). Weeks 13-52 are a tracked follow-up, since each tip requires genuinely verifying a real official source rather than writing plausible-sounding guidance — see the project's GitHub issues for the tracking ticket.

## Styling

Follows the project's component pattern:
- `weekly-tip.styles.ts`: Tailwind classes
- `weekly-tip.css`: `html.dark` overrides for dark mode
- `weekly-tip.types.ts`: TypeScript prop types
