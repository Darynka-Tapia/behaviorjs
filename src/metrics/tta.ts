// src/metrics/tta.ts

// Registros temporales
const hoverRegistry: Record<string, number> = {};
const discoveryRegistry: Record<string, number> = {};

/**
 * Registra el inicio del hover. 
 * Si es la primera vez que toca el target, sella el tiempo de descubrimiento.
 */
export const trackHoverStart = (targetName: string, sessionStartTime: number) => {
  const now = performance.now();
  
  // 1. SELLADO DE DESCUBRIMIENTO: Solo se guarda la primera vez que ocurre
  if (!discoveryRegistry[targetName]) {
    discoveryRegistry[targetName] = Math.round(now - sessionStartTime);
  }
  
  // 2. REGISTRO DE HOVER: Se actualiza para medir la duda del último movimiento
  hoverRegistry[targetName] = now;
};

export const calculateTTA = (
  event: MouseEvent, 
  targets: string[], 
  startTime: number,
  alreadyCaptured: Set<string>
) => {
  const target = event.target as HTMLElement;

  for (const name of targets) {
    if (alreadyCaptured.has(name)) continue;

    const container = target.closest(`[data-behavior="${name}"]`) as HTMLElement;

    if (container) {
      const endTime = performance.now();
      
      // --- LÓGICA DE TIEMPOS ---
      
      // Recuperamos el descubrimiento que sellamos en el mouseover
      const visualDiscoveryMs = discoveryRegistry[name] || 0;

      // Calculamos la duda (Hesitation)
      const startHoverTime = hoverRegistry[name];
      let cognitiveHesitation = startHoverTime ? Math.round(endTime - startHoverTime) : 0;
      
      // Filtro de ruido: Si la duda es > 15s, probablemente no es duda real
      if (cognitiveHesitation > 15000) {
        cognitiveHesitation = 0;
      }

      // Tiempo total de la acción
      const totalTTA = Math.round(endTime - startTime);

      // Limpieza de registros para este target
      delete hoverRegistry[name];
      delete discoveryRegistry[name];

      // --- ANÁLISIS DE DISEÑO ---
      const getStyleMetrics = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        const hasShadow = style.boxShadow !== 'none' && style.boxShadow !== 'rgba(0, 0, 0, 0) 0px 0px 0px 0px';
        const hasBorder = style.borderStyle !== 'none' && style.borderWidth !== '0px';
        const rawRadius = parseInt(style.borderRadius);
        const hasRadius = !isNaN(rawRadius) && rawRadius > 2;
        const hasPointer = style.cursor === 'pointer';
        
        return {
          hasShadow,
          hasBorder,
          hasRadius,
          hasPointer,
          borderRadius: style.borderRadius,
          backgroundColor: style.backgroundColor,
          color: style.color,
          isVisualAffordance: (hasRadius && (hasShadow || hasBorder)) || hasPointer
        };
      };

      const childMetrics = getStyleMetrics(target);
      const containerMetrics = getStyleMetrics(container);
      const useContainerData = !childMetrics.isVisualAffordance && containerMetrics.isVisualAffordance;
      const finalMetrics = useContainerData ? containerMetrics : childMetrics;

      return {
        action: name,
        totalTTAMs: totalTTA,
        visualDiscoveryMs: visualDiscoveryMs, // <--- Sella el hallazgo visual real
        cognitiveHesitationMs: cognitiveHesitation,

        element: {
          tag: target.tagName.toLowerCase(),
          id: target.id || null,
          classes: target.className || null,
          textContent: target.innerText?.trim().substring(0, 40) || null,
          outerHTML: target.outerHTML.substring(0, 150),
          path: getSimplePath(target)
        },

        hitDetails: {
          targetTag: container.tagName.toLowerCase(),
          targetId: container.id || null,
          isDirectHit: target === container,
          measuredFromParent: useContainerData
        },

        affordanceScore: {
          hasVisualAffordance: finalMetrics.isVisualAffordance,
          hasPointerCursor: finalMetrics.hasPointer,
          hasShadow: finalMetrics.hasShadow,
          borderRadius: finalMetrics.borderRadius,
          backgroundColor: finalMetrics.backgroundColor,
          color: finalMetrics.color
        }
      };
    }
  }
  return null;
};

function getSimplePath(el: HTMLElement): string {
  const path = [];
  let current: HTMLElement | null = el;
  for (let i = 0; i < 3; i++) {
    if (!current || current.tagName === 'HTML') break;
    const identifier = current.id ? `#${current.id}` : '';
    path.unshift(current.tagName.toLowerCase() + identifier);
    current = current.parentElement;
  }
  return path.join(' > ');
}