let lastClickTime = 0;
let clickCount = 0;
let lastTarget: HTMLElement | null = null;

export const trackMissClick = (event: MouseEvent, targets: string[]) => {
  const target = event.target as HTMLElement;
  const now = Date.now();

  // 1. Lógica de Rage Click
  if (target === lastTarget && (now - lastClickTime) < 500) {
    clickCount++;
  } else {
    clickCount = 1;
  }
  lastClickTime = now;
  lastTarget = target;

  // 2. Filtros de exclusión
  const isNative = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
  const isCustomTarget = targets.some(name => target.closest(`[data-behavior="${name}"]`));
  const isExplicitlyInteractive = target.closest('[data-behavior="interactive"]');

  if (isNative || isCustomTarget || isExplicitlyInteractive) {
    return null;
  }

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
      isDraggable: ['grab', 'grabbing', 'move'].includes(style.cursor),
      // Es un affordance si tiene (radio + sombra/borde) o cursor pointer
      isVisualAffordance: (hasRadius && (hasShadow || hasBorder)) || hasPointer
    };
  };

  // 3. LÓGICA DE PRIORIDAD (Hijo vs Padre)
  const childMetrics = getStyleMetrics(target);
  let finalMetrics = childMetrics;
  let measuredFromParent = false;
  let visualContainer = target;

  // Si el hijo NO parece interactivo, probamos con el padre
  if (!childMetrics.isVisualAffordance && target.parentElement) {
    const parentMetrics = getStyleMetrics(target.parentElement);
    if (parentMetrics.isVisualAffordance) {
      finalMetrics = parentMetrics;
      measuredFromParent = true;
      visualContainer = target.parentElement;
    }
  }

  return {
    type: 'missclick',
    timestamp: now,
    element: {
      tag: target.tagName.toLowerCase(),
      id: target.id || null,
      classes: target.className || null,
      textContent: target.innerText?.trim().substring(0, 40) || null,
      outerHTML: target.outerHTML.substring(0, 150),
      path: getSimplePath(target)
    },
    container: {
      tag: visualContainer.tagName.toLowerCase(),
      classes: visualContainer.className || null
    },
    behavior: {
      isRageClick: clickCount >= 3,
      clickSequence: clickCount
    },
    affordanceCheck: {
      measuredFromParent: measuredFromParent, // Aquí indicamos si tuvimos que subir al padre
      hasPointerCursor: finalMetrics.hasPointer,
      isDraggableCursor: finalMetrics.isDraggable,
      hasVisualAffordance: finalMetrics.isVisualAffordance,
      hasShadow: finalMetrics.hasShadow,
      hasBorder: finalMetrics.hasBorder,
      borderRadius: finalMetrics.borderRadius,
      backgroundColor: finalMetrics.backgroundColor
    },
    location: { x: event.clientX, y: event.clientY }
  };
};

function getSimplePath(el: HTMLElement): string {
  const path = [];
  let current: HTMLElement | null = el;
  for (let i = 0; i < 3; i++) {
    if (!current || current.tagName === 'HTML') break;
    path.unshift(current.tagName.toLowerCase() + (current.id ? `#${current.id}` : ''));
    current = current.parentElement;
  }
  return path.join(' > ');
}