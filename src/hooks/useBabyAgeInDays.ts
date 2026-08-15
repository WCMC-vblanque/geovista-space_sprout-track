import { useCallback, useEffect, useState } from 'react';

function computeAgeInDays(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes a baby's current age in whole days from their birth date.
 * Returns null if no birth date is provided.
 *
 * Recomputes hourly and on tab/window focus so a day boundary crossed
 * while the app is left open (or a system clock change) is reflected
 * without requiring a remount.
 */
export function useBabyAgeInDays(birthDate: Date | string | null | undefined): number | null {
  const [ageInDays, setAgeInDays] = useState<number | null>(() => computeAgeInDays(birthDate));

  const recompute = useCallback(() => {
    setAgeInDays(computeAgeInDays(birthDate));
  }, [birthDate]);

  useEffect(() => {
    recompute();
    const interval = setInterval(recompute, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', recompute);
    window.addEventListener('focus', recompute);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', recompute);
      window.removeEventListener('focus', recompute);
    };
  }, [recompute]);

  return ageInDays;
}
