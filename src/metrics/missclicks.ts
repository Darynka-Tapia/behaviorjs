let lastClickTime = 0;
let clickCount = 0;
let lastTarget: HTMLElement | null = null;
// Guardamos la referencia al último objeto de missclick generado
let lastGeneratedMissClick: any = null; 
const SESSION_THRESHOLD = 2000; // 2 segundos para separar ráfagas

export const trackMissClick = (event: MouseEvent, targets: string[]) => {
  const target = event.target as HTMLElement;
  const now = Date.now();

  // 1. Lógica de Rage Click y Acumulación
  const isSameTarget = target === lastTarget;
  const isWithinSession = (now - lastClickTime) < SESSION_THRESHOLD;

  if (isSameTarget && (now - lastClickTime) < 500) {
    clickCount++;
  } else if (!isSameTarget || !isWithinSession) {
    // Si cambió el target o pasó mucho tiempo, reseteamos contador
    clickCount = 1;
  } else {
    // Es el mismo target dentro de la sesión, pero no necesariamente un "rage" (clic lento)
    clickCount++;
  }

  // 2. Filtros de exclusión (Se mantienen igual)
  const isNative = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
  const isCustomTarget = targets.some(name => target.closest(`[data-behavior="${name}"]`));
  const isExplicitlyInteractive = target.closest('[data-behavior="interactive"]');

  if (isNative || isCustomTarget || isExplicitlyInteractive) {
    lastGeneratedMissClick = null; // Limpiamos rastro si interactúa con algo válido
    return null;
  }

  // Si es el mismo elemento y estamos dentro del umbral de tiempo, 
  // actualizamos el objeto anterior en lugar de crear uno nuevo
  if (isSameTarget && isWithinSession && lastGeneratedMissClick) {
    lastGeneratedMissClick.timestamp = now; // Actualizamos al último clic
    lastGeneratedMissClick.behavior.clickSequence = clickCount;
    lastGeneratedMissClick.behavior.isRageClick = clickCount >= 3;
    
    // Devolvemos un flag o el objeto con una propiedad 'updated' 
    return { ...lastGeneratedMissClick, isUpdate: true };
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
      isVisualAffordance: (hasRadius && (hasShadow || hasBorder)) || hasPointer
    };
  };

  // 3. LÓGICA DE PRIORIDAD (Hijo vs Padre)
  const childMetrics = getStyleMetrics(target);
  let finalMetrics = childMetrics;
  let measuredFromParent = false;
  let visualContainer = target;

  if (!childMetrics.isVisualAffordance && target.parentElement) {
    const parentMetrics = getStyleMetrics(target.parentElement);
    if (parentMetrics.isVisualAffordance) {
      finalMetrics = parentMetrics;
      measuredFromParent = true;
      visualContainer = target.parentElement;
    }
  }

  // 4. CREACIÓN DE NUEVO EVENTO
  const newMissClick = {
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
      measuredFromParent: measuredFromParent,
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

  // Guardamos referencia y actualizamos variables de control
  lastClickTime = now;
  lastTarget = target;
  lastGeneratedMissClick = newMissClick;

  return newMissClick;
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