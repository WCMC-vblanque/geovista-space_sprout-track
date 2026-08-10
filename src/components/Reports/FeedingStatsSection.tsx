'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from 'lucide-react';
import { bottleBaby } from '@lucide/lab';
import { cn } from '@/src/lib/utils';
import { Card, CardContent } from '@/src/components/ui/card';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/src/components/ui/accordion';
import { styles } from './reports.styles';
import { FeedingStats, ActivityType, DateRange } from './reports.types';
import FeedingChartModal, { FeedingChartMetric } from './FeedingChartModal';
import { useLocalization } from '@/src/context/localization';
import { useUnit } from '@/src/hooks/useUnit';
import { useBaby } from '@/app/context/baby';

interface FeedingStatsSectionProps {
  stats: FeedingStats;
  activities: ActivityType[];
  dateRange: DateRange;
}

// Helper function to format minutes into hours and minutes
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * FeedingStatsSection Component
 *
 * Displays feeding statistics including bottle, breast, and solids feeds.
 */
const FeedingStatsSection: React.FC<FeedingStatsSectionProps> = ({ stats, activities, dateRange }) => {
  const { t } = useLocalization();
  const { unitSymbol } = useUnit();
  const { selectedBaby } = useBaby();
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartMetric, setChartMetric] = useState<FeedingChartMetric | null>(null);
  const [breastfeedingSinceBirthMinutes, setBreastfeedingSinceBirthMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedBaby?.id) {
      setBreastfeedingSinceBirthMinutes(null);
      return;
    }

    let cancelled = false;
    const fetchSinceBirthTotal = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/feed-log/breastfeeding-total?babyId=${selectedBaby.id}`, {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data.success) {
            setBreastfeedingSinceBirthMinutes(data.data.totalMinutes);
          }
        }
      } catch {
        // Leave since-birth total unset on error
      }
    };
    fetchSinceBirthTotal();

    return () => {
      cancelled = true;
    };
  }, [selectedBaby?.id]);

  return (
    <>
      <AccordionItem value="feeding">
        <AccordionTrigger className={cn(styles.accordionTrigger, "reports-accordion-trigger")}>
          <Icon iconNode={bottleBaby} className={cn(styles.accordionTriggerIcon, "reports-accordion-trigger-icon reports-icon-feed")} />
          <span>{t('Feeding Statistics')}</span>
        </AccordionTrigger>
        <AccordionContent className={styles.accordionContent}>
          <div className={styles.statsGrid}>
            <Card
              className={cn(styles.statCard, "reports-stat-card cursor-pointer")}
              onClick={() => {
                setChartMetric('bottle');
                setChartModalOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className={cn(styles.statCardValue, "reports-stat-card-value")}>
                  {stats.bottleFeeds.count}
                </div>
                <div className={cn(styles.statCardLabel, "reports-stat-card-label")}>{t('Bottle Feeds')} ({t('avg')})</div>
                {stats.bottleFeeds.avgByType.length > 0 && (
                  <div className={cn(styles.statCardSubLabel, "reports-stat-card-sublabel")}>
                    {stats.bottleFeeds.avgByType.map((bt, idx) => (
                      <span key={bt.type}>
                        {bt.type}: {bt.avgAmount.toFixed(1)} {unitSymbol(bt.unit)} avg
                        {idx < stats.bottleFeeds.avgByType.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(styles.statCard, "reports-stat-card cursor-pointer")}
              onClick={() => {
                setChartMetric('breast');
                setChartModalOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className={cn(styles.statCardValue, "reports-stat-card-value")}>
                  {stats.breastFeeds.count}
                </div>
                <div className={cn(styles.statCardLabel, "reports-stat-card-label")}>{t('Breast Feeds')} ({t('avg')})</div>
                {(stats.breastFeeds.leftCount > 0 || stats.breastFeeds.rightCount > 0) && (
                  <div className={cn(styles.statCardSubLabel, "reports-stat-card-sublabel")}>
                    {t('L:')} {formatMinutes(stats.breastFeeds.avgLeftMinutes)} {t('R:')} {formatMinutes(stats.breastFeeds.avgRightMinutes)}
                  </div>
                )}
                {stats.breastFeeds.totalMinutes > 0 && (
                  <div className={cn(styles.statCardSubLabel, "reports-stat-card-sublabel")}>
                    {t('Total for period:')} {formatMinutes(stats.breastFeeds.totalMinutes)}
                  </div>
                )}
                {breastfeedingSinceBirthMinutes !== null && breastfeedingSinceBirthMinutes > 0 && (
                  <div className={cn(styles.statCardSubLabel, "reports-stat-card-sublabel")}>
                    {t('Total since birth:')} {formatMinutes(breastfeedingSinceBirthMinutes)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(styles.statCard, "reports-stat-card cursor-pointer")}
              onClick={() => {
                setChartMetric('solids');
                setChartModalOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className={cn(styles.statCardValue, "reports-stat-card-value")}>
                  {stats.solidsFeeds.count}
                </div>
                <div className={cn(styles.statCardLabel, "reports-stat-card-label")}>{t('Solids')} ({t('avg')})</div>
                {stats.solidsFeeds.avgByFood.length > 0 && (
                  <div className={cn(styles.statCardSubLabel, "reports-stat-card-sublabel")}>
                    {stats.solidsFeeds.avgByFood.slice(0, 3).map((sf, idx) => (
                      <span key={sf.food}>
                        {sf.food}: {sf.avgAmount.toFixed(1)} {unitSymbol(sf.unit)} avg
                        {idx < Math.min(stats.solidsFeeds.avgByFood.length, 3) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Feeding chart modal */}
      <FeedingChartModal
        open={chartModalOpen}
        onOpenChange={(open) => {
          setChartModalOpen(open);
          if (!open) {
            setChartMetric(null);
          }
        }}
        metric={chartMetric}
        activities={activities}
        dateRange={dateRange}
      />
    </>
  );
};

export default FeedingStatsSection;

