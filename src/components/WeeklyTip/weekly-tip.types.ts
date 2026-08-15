import { Baby } from '@prisma/client';

/**
 * Props for the WeeklyTip component
 */
export interface WeeklyTipProps {
  /** The currently selected baby, used to compute age in days */
  baby: Baby | null | undefined;
  /** How often a new tip is featured; controls which tips are reachable via navigation */
  frequency: 'daily' | 'weekly';
}
