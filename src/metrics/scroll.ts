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
  
  // Si la página no tiene scroll (es muy corta), devolvemos null
  if (totalScrollable <= 0) return null;

  // Porcentaje actual de la posición del scroll
  const currentPercentage = Math.round((scrollTop / totalScrollable) * 100);

  // Solo actualizamos si el usuario ha bajado más que su marca anterior (Down-only)
  if (currentPercentage > maxScrollReached) {
    maxScrollReached = currentPercentage;
  }

  return {
    percentage: currentPercentage,
    maxPercentage: maxScrollReached,
    currentSection: getCurrentSectionContext()
  };
};

/**
 * Identifica la sección o el encabezado más cercano para dar contexto al scroll
 */
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
  // Prioridad: ID > Texto de Título > Tag.Clase
  return (
    el.id || 
    (el.tagName.startsWith('H') ? `header:${el.innerText.substring(0, 20).trim()}` : null) ||
    `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}`
  );
}