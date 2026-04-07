export interface NavigationMetrics {
  domInteractiveMs: number;
  loadEventEndMs: number;
  totalLoadTimeMs: number;
}

export const getNavigationMetrics = (): NavigationMetrics => {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navEntry) {
    return {
      domInteractiveMs: Math.round(navEntry.domInteractive),
      loadEventEndMs: Math.round(navEntry.loadEventEnd),
      totalLoadTimeMs: Math.round(navEntry.duration),
    };
  }

  return {
    domInteractiveMs: 0,
    loadEventEndMs: 0,
    totalLoadTimeMs: 0,
  };
};