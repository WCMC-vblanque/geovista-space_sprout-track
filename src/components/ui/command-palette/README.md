# CommandPalette ("Superbuscador")

A keyboard-first command palette for quickly jumping to features and running
actions. The user opens it with `Ctrl/Cmd + K` (or a search button), types a few
words, and navigates the filtered list with the arrow keys + Enter.

## Features

- **Accent- and case-insensitive** filtering (`"pañal"` matches `"panal"`).
- **Multilingual matching** via per-command `keywords` aliases, so a command is
  found whether the user types in English, Spanish, French, etc.
- **Keyboard navigation**: `↑`/`↓` to move, `Enter` to run, `Esc` to close.
- **Mouse/touch** support — items are also clickable/tappable (works on mobile,
  where there is no physical keyboard).
- Optional **group headings** and **icons** per command.
- Dark mode via `html.dark` overrides in `command-palette.css` (no `dark:`
  Tailwind classes), per project styling conventions.

## Usage

The component is controlled. Build the `commands` array where the consumer has
access to navigation and action handlers (e.g. the app layout), then render:

```tsx
import { CommandPalette } from '@/src/components/ui/command-palette';
import { CommandItem } from '@/src/components/ui/command-palette/command-palette.types';

const commands: CommandItem[] = [
  {
    id: 'calendar',
    label: t('Calendar'),
    keywords: 'calendar calendario calendrier events',
    group: t('Navigation'),
    icon: CalendarIcon,
    action: () => router.push('/calendar'),
  },
  // ...
];

<CommandPalette open={open} onOpenChange={setOpen} commands={commands} />
```

To wire the `Ctrl/Cmd + K` shortcut, add a global `keydown` listener in the
consumer that toggles the `open` state.

## Props

| Prop           | Type                       | Description                                  |
| -------------- | -------------------------- | -------------------------------------------- |
| `open`         | `boolean`                  | Whether the palette is open (controlled).    |
| `onOpenChange` | `(open: boolean) => void`  | Called when the open state should change.     |
| `commands`     | `CommandItem[]`            | Commands to display and filter.              |
| `placeholder`  | `string?`                  | Search input placeholder.                    |
| `emptyMessage` | `string?`                  | Message shown when nothing matches.          |

### `CommandItem`

| Field      | Type           | Description                                            |
| ---------- | -------------- | ----------------------------------------------------- |
| `id`       | `string`       | Stable unique id.                                     |
| `label`    | `string`       | Localized text shown to the user.                     |
| `keywords` | `string?`      | Extra space-separated match terms (not displayed).    |
| `group`    | `string?`      | Optional group heading.                               |
| `icon`     | `LucideIcon?`  | Optional leading icon.                                |
| `action`   | `() => void`   | Runs on select (click, tap, or Enter).                |

## Files

- `index.tsx` — component implementation
- `command-palette.styles.ts` — Tailwind class definitions (light mode)
- `command-palette.css` — `html.dark` dark-mode overrides
- `command-palette.types.ts` — TypeScript types
