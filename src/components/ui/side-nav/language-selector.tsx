'use client';

import React from 'react';
import { useLocalization } from '@/src/context/localization';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/src/components/ui/dropdown-menu';
import { sideNavStyles } from './side-nav.styles';
import { cn } from '@/src/lib/utils';
import {
  supportedLanguages,
  getSupportedLanguage,
} from '@/src/localization/supported-languages-config';

// Flag emoji per supported language code -- easier to scan at a glance than
// a text abbreviation, and needs no image assets.
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  nl: '🇳🇱',
  'pt-pt': '🇵🇹',
  'pt-br': '🇧🇷',
  ro: '🇷🇴',
};

function getFlag(code: string): string {
  return LANGUAGE_FLAGS[code.toLowerCase()] ?? '🌐';
}

/**
 * LanguageSelector component
 *
 * A dropdown component that allows users to select their preferred language.
 * Displays a flag icon for the current language and shows available
 * languages (flag + name) in a dropdown.
 */
export function LanguageSelector() {
  const { language, setLanguage, t } = useLocalization();

  const currentLanguage = language.toLowerCase();
  const currentLanguageInfo = getSupportedLanguage(currentLanguage) ?? {
    code: currentLanguage,
    name: currentLanguage,
    abbreviation: currentLanguage.toUpperCase(),
  };

  const handleLanguageChange = async (newLanguage: string) => {
    await setLanguage(newLanguage);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          sideNavStyles.languageTrigger,
          "side-nav-language-trigger"
        )}
        aria-label={t('Select language')}
      >
        <span className="text-lg" aria-hidden="true">{getFlag(currentLanguageInfo.code)}</span>
        <span className="sr-only">{currentLanguageInfo.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[200px] overflow-y-auto side-nav-language-selector"
        side="top"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuRadioGroup
          value={currentLanguage}
          onValueChange={handleLanguageChange}
        >
          {supportedLanguages.map((lang) => (
            <DropdownMenuRadioItem
              key={lang.code}
              value={lang.code}
              className="side-nav-language-item flex items-center gap-2"
            >
              <span aria-hidden="true">{getFlag(lang.code)}</span>
              <span>{lang.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
