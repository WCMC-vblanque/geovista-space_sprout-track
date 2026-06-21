'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLocalization } from '@/src/context/localization';
import { commandPaletteStyles as s } from './command-palette.styles';
import { CommandItem, CommandPaletteProps } from './command-palette.types';
import './command-palette.css';

/** Lowercases and strips accents so "Pañol" matches "panol". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * CommandPalette ("superbuscador")
 *
 * A keyboard-first command palette. Type a few words to filter features and
 * actions, navigate with the arrow keys, and press Enter to run the selected
 * command. Matching is accent-insensitive and also checks each command's
 * `keywords`, so multilingual aliases work regardless of the active language.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder,
  emptyMessage,
}: CommandPaletteProps) {
  const { t } = useLocalization();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset the query whenever the palette is opened.
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands;
    const terms = q.split(/\s+/);
    return commands.filter((cmd) => {
      const haystack = normalize(`${cmd.label} ${cmd.keywords ?? ''} ${cmd.group ?? ''}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [commands, query]);

  // Keep the highlighted index within bounds when the result set changes.
  React.useEffect(() => {
    setActiveIndex((prev) => (prev >= filtered.length ? 0 : prev));
  }, [filtered.length]);

  // Scroll the highlighted item into view.
  React.useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runCommand = (cmd?: CommandItem) => {
    if (!cmd) return;
    onOpenChange(false);
    cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[activeIndex]);
    }
  };

  let renderIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(s.overlay, 'command-palette-overlay')} />
        <DialogPrimitive.Content
          className={cn(s.content, 'command-palette-content')}
          onKeyDown={handleKeyDown}
          aria-label={t('Search features')}
        >
          <DialogPrimitive.Title className="sr-only">{t('Search features')}</DialogPrimitive.Title>
          <div className={cn(s.inputWrapper, 'command-palette-input-wrapper')}>
            <Search className={s.inputIcon} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder ?? t('Type to search…')}
              className={cn(s.input, 'command-palette-input')}
              aria-label={t('Search features')}
            />
          </div>

          <div ref={listRef} className={s.list}>
            {filtered.length === 0 ? (
              <div className={cn(s.empty, 'command-palette-empty')}>
                {emptyMessage ?? t('No results found')}
              </div>
            ) : (
              filtered.map((cmd, i) => {
                renderIndex += 1;
                const index = renderIndex;
                const showGroup = cmd.group && cmd.group !== filtered[i - 1]?.group;
                const isActive = index === activeIndex;
                const Icon = cmd.icon;
                return (
                  <React.Fragment key={cmd.id}>
                    {showGroup && (
                      <div className={cn(s.groupLabel, 'command-palette-group-label')}>{cmd.group}</div>
                    )}
                    <button
                      type="button"
                      data-index={index}
                      onClick={() => runCommand(cmd)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={cn(
                        s.item,
                        'command-palette-item',
                        isActive && s.itemActive,
                        isActive && 'command-palette-item-active'
                      )}
                    >
                      {Icon && <Icon className={cn(s.itemIcon, isActive && s.itemIconActive)} />}
                      <span className="flex-1 truncate">{cmd.label}</span>
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className={cn(s.hint, 'command-palette-hint')}>
            <span className={cn(s.kbd, 'command-palette-kbd')}>↑↓</span>
            <span className={cn(s.kbd, 'command-palette-kbd')}>↵</span>
            <span className={cn(s.kbd, 'command-palette-kbd')}>esc</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
