'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { useLocalization } from '@/src/context/localization';
import { useBabyAgeInDays } from '@/src/hooks/useBabyAgeInDays';
import { DAILY_TIPS } from '@/src/constants/dailyTips';

// Import component-specific files
import './weekly-tip.css';
import { weeklyTipStyles } from './weekly-tip.styles';
import { WeeklyTipProps } from './weekly-tip.types';

const VIEWED_TIPS_STORAGE_KEY = 'viewedTipDays';

function getViewedDays(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VIEWED_TIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markDayViewed(day: number): void {
  if (typeof window === 'undefined') return;
  const viewed = getViewedDays();
  if (!viewed.includes(day)) {
    window.localStorage.setItem(VIEWED_TIPS_STORAGE_KEY, JSON.stringify([...viewed, day]));
  }
}

export const WeeklyTip: React.FC<WeeklyTipProps> = ({ baby, frequency }) => {
  const { t } = useLocalization();
  const ageInDays = useBabyAgeInDays(baby?.birthDate);

  // "weekly" frequency only surfaces the headline tip for each week;
  // "daily" surfaces every day that has been authored.
  const tipList = useMemo(
    () => (frequency === 'daily' ? DAILY_TIPS : DAILY_TIPS.filter((entry) => entry.isWeeklyFeature)),
    [frequency]
  );

  const defaultIndex = useMemo(() => {
    if (ageInDays === null || tipList.length === 0) return -1;
    const day = Math.max(1, ageInDays);
    let idx = -1;
    for (let i = 0; i < tipList.length; i += 1) {
      if (tipList[i].day <= day) idx = i;
      else break;
    }
    return idx;
  }, [ageInDays, tipList]);

  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Manual left/right navigation is reset whenever the baby or the
  // frequency setting changes, so the card falls back to "today's" tip.
  useEffect(() => {
    setViewIndex(null);
  }, [baby?.id, frequency]);

  const activeIndex = viewIndex !== null ? viewIndex : defaultIndex;
  const tip = activeIndex >= 0 ? tipList[activeIndex] : null;

  // Fold to headline-only on every visit after the first time a given
  // day's tip has been shown, tracked per-browser via localStorage.
  useEffect(() => {
    if (!tip) return;
    const viewed = getViewedDays();
    if (viewed.includes(tip.day)) {
      setExpanded(false);
    } else {
      setExpanded(true);
      markDayViewed(tip.day);
    }
  }, [tip?.day]);

  if (!tip) return null;

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < tipList.length - 1;
  const weekNumber = Math.floor((tip.day - 1) / 7) + 1;

  return (
    <Card className={weeklyTipStyles.container}>
      <div className={weeklyTipStyles.header}>
        <div className={weeklyTipStyles.headerLabel}>
          <Sparkles className={weeklyTipStyles.headerIcon} size={16} />
          <h3 className={weeklyTipStyles.headerText}>
            {tip.isWeeklyFeature
              ? `${t('Week')} ${weekNumber} ${t('Tip')}`
              : `${t('Day')} ${tip.day} ${t('Tip')}`}
          </h3>
        </div>
        <div className={weeklyTipStyles.navGroup}>
          <button
            type="button"
            className={weeklyTipStyles.navButton}
            onClick={() => setViewIndex(activeIndex - 1)}
            disabled={!canGoPrev}
            aria-label={t('Previous tip')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={weeklyTipStyles.navButton}
            onClick={() => setViewIndex(activeIndex + 1)}
            disabled={!canGoNext}
            aria-label={t('Next tip')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={weeklyTipStyles.body}>
        <button
          type="button"
          className={weeklyTipStyles.titleRow}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <span className={weeklyTipStyles.title}>{t(tip.title)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 flex-shrink-0 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
          )}
        </button>
        {expanded && (
          <>
            <p className={weeklyTipStyles.text}>{t(tip.tip)}</p>
            <div className={weeklyTipStyles.source}>
              {t('Source')}:{' '}
              <a
                href={tip.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={weeklyTipStyles.sourceLink}
              >
                {tip.sourceName}
              </a>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default WeeklyTip;
