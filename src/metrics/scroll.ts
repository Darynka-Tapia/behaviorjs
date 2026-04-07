export interface ScrollData {
  percentage: number;
  maxPercentage: number;
  currentSection: string;
}

let maxScrollReached = 0;

/**
 * Calcula el progreso de lectura (solo avance acumulado)
 */
export const trackScrollDepth = (): ScrollData | null => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight;
  const winHeight = window.innerHeight;

  const totalScrollable = docHeight - winHeight;
  
  if (totalScrollable <= 0) return null;

  const currentPercentage = Math.round((scrollTop / totalScrollable) * 100);

  if (currentPercentage > maxScrollReached) {
    maxScrollReached = currentPercentage;
  }

  return {
    percentage: currentPercentage,
    maxPercentage: maxScrollReached,
    currentSection: getCurrentSectionContext()
  };
};

function getCurrentSectionContext(): string {
  const candidates = document.querySelectorAll('section, [id], h2, h3');
  let bestCandidate: HTMLElement | null = null;
  let minDistance = Infinity;

  candidates.forEach((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect();
    const distance = Math.abs(rect.top - 100);

    if (rect.top < window.innerHeight && rect.bottom > 0) {
      if (distance < minDistance) {
        minDistance = distance;
        bestCandidate = el as HTMLElement;
      }
    }
  });

  if (!bestCandidate) return "inicio";

  const el = bestCandidate as HTMLElement;
  return (
    el.id || 
    (el.tagName.startsWith('H') ? `header:${el.innerText.substring(0, 20).trim()}` : null) ||
    `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}`
  );
}