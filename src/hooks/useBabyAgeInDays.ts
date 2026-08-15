import { useMemo } from 'react';

/**
 * Computes a baby's current age in whole days from their birth date.
 * Returns null if no birth date is provided.
 */
export function useBabyAgeInDays(birthDate: Date | string | null | undefined): number | null {
  return useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [birthDate]);
}
