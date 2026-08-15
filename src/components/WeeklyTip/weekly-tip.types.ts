import { Baby } from '@prisma/client';

/**
 * Props for the WeeklyTip component
 */
export interface WeeklyTipProps {
  /** The currently selected baby, used to compute age in weeks */
  baby: Baby | null | undefined;
}
