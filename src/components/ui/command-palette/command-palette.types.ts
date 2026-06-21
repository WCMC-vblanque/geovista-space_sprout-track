import { LucideIcon } from 'lucide-react';

/**
 * A single actionable entry in the command palette ("superbuscador").
 */
export interface CommandItem {
  /** Stable unique identifier for the command. */
  id: string;
  /** Localized label shown to the user. */
  label: string;
  /**
   * Extra space-separated terms used only for matching (not displayed).
   * Useful for multilingual aliases, e.g. "diaper pañal feed toma".
   */
  keywords?: string;
  /** Optional group heading the command is listed under. */
  group?: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Invoked when the command is selected (click, tap, or Enter). */
  action: () => void;
}

export interface CommandPaletteProps {
  /** Whether the palette is open. */
  open: boolean;
  /** Called when the open state should change. */
  onOpenChange: (open: boolean) => void;
  /** The list of commands to display and filter. */
  commands: CommandItem[];
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Message shown when no command matches the query. */
  emptyMessage?: string;
}
