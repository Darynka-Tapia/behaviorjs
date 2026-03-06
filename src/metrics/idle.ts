// src/metrics/idle.ts

let idleTimer: number;
let isUserIdle = false;
let idleStartTime = 0;

// Umbral de inactividad: 30 segundos
// Si el usuario no mueve el mouse o teclea en este tiempo, se considera "Idle"
const IDLE_THRESHOLD = 30000; 

/**
 * Inicializa el rastreador de inactividad
 * @param onStatusChange Callback que se ejecuta al cambiar el estado de inactividad
 */
export const initIdleTracker = (onStatusChange: (isIdle: boolean, duration: number) => void) => {
  
  const resetTimer = () => {
    // Si el usuario estaba inactivo y regresa:
    if (isUserIdle) {
      const duration = performance.now() - idleStartTime;
      isUserIdle = false;
      // Notificamos que regresó y cuánto tiempo estuvo ausente
      onStatusChange(false, duration); 
    }

    // Reiniciamos el contador de 30 segundos
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(goIdle, IDLE_THRESHOLD);
  };

  const goIdle = () => {
    isUserIdle = true;
    idleStartTime = performance.now();
    // Notificamos que el usuario entró en estado inactivo
    onStatusChange(true, 0);
  };

  // Eventos que reinician el temporizador (indican actividad humana)
  const activityEvents = [
    'mousedown', 
    'mousemove', 
    'keypress', 
    'scroll', 
    'touchstart',
    'wheel'
  ];

  // Escuchamos los eventos de forma pasiva para no afectar el rendimiento
  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, resetTimer, { passive: true });
  });

  // Iniciamos el timer por primera vez
  resetTimer();
};

/**
 * Helper opcional para saber el estado actual desde fuera
 */
export const getIsIdle = () => isUserIdle;