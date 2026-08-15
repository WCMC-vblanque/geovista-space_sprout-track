import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { useLocalization } from '@/src/context/localization';
import { useBabyAgeInWeeks } from '@/src/hooks/useBabyAgeInWeeks';
import { WEEKLY_TIPS } from '@/src/constants/weeklyTips';

// Import component-specific files
import './weekly-tip.css';
import { weeklyTipStyles } from './weekly-tip.styles';
import { WeeklyTipProps } from './weekly-tip.types';

export const WeeklyTip: React.FC<WeeklyTipProps> = ({ baby }) => {
  const { t } = useLocalization();
  const ageInWeeks = useBabyAgeInWeeks(baby?.birthDate);

  if (ageInWeeks === null) return null;

  // Clamp to week 1 before birth-week rollover; hide once past the
  // currently-covered range (weeks 1-12) rather than show a stale tip.
  const week = Math.max(1, ageInWeeks);
  const tip = WEEKLY_TIPS.find((entry) => entry.week === week);
  if (!tip) return null;

  return (
    <Card className={weeklyTipStyles.container}>
      <div className={weeklyTipStyles.header}>
        <Sparkles className={weeklyTipStyles.headerIcon} size={16} />
        <h3 className={weeklyTipStyles.headerText}>
          {t('Week')} {tip.week} {t('Tip')}
        </h3>
      </div>
      <div className={weeklyTipStyles.body}>
        <div className={weeklyTipStyles.title}>{t(tip.title)}</div>
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
      </div>
    </Card>
  );
};

export default WeeklyTip;
