export const calculateTTA = (
  event: MouseEvent, 
  targets: string[], 
  startTime: number,
  alreadyCaptured: Set<string>
) => {
  const target = event.target as HTMLElement;

  for (const name of targets) {
    if (alreadyCaptured.has(name)) continue;

    // 1. Buscamos el ancestro que tiene el data-behavior (El objetivo real)
    const container = target.closest(`[data-behavior="${name}"]`) as HTMLElement;

    if (container) {
      const endTime = performance.now();
      
      // --- FUNCIÓN DE ANÁLISIS REUTILIZABLE ---
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

      // 2. LÓGICA DE PRIORIDAD (Hijo vs Contenedor)
      const childMetrics = getStyleMetrics(target);
      const containerMetrics = getStyleMetrics(container);

      // Si el hijo no tiene diseño pero el contenedor sí, escalamos la métrica
      const useContainerData = !childMetrics.isVisualAffordance && containerMetrics.isVisualAffordance;
      const finalMetrics = useContainerData ? containerMetrics : childMetrics;

      return {
        action: name,
        milliseconds: Math.round(endTime - startTime),
        
        // 3. DNI DETALLADO DEL ELEMENTO (Igual que en Miss-clicks)
        element: {
          tag: target.tagName.toLowerCase(),
          id: target.id || null,
          classes: target.className || null,
          textContent: target.innerText?.trim().substring(0, 40) || null,
          outerHTML: target.outerHTML.substring(0, 150),
          path: getSimplePath(target)
        },

        // 4. DETALLES DEL HIT (Para el profesor)
        hitDetails: {
          targetTag: container.tagName.toLowerCase(),
          targetId: container.id || null,
          isDirectHit: target === container,
          measuredFromParent: useContainerData
        },

        // 5. SCORE DE AFFORDANCE (Para auditoría de UX)
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

/**
 * Genera una ruta simple del DOM para contexto
 */
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