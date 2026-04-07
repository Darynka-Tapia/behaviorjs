let idleTimer: number;
let isUserIdle = false;
let idleStartTime = 0;

// Inactivity threshold: 30 seconds
// If the user does not move the mouse or type during this time, it is considered "idle"
const IDLE_THRESHOLD = 30000; 

/**
 * Initialize the inactivity tracker
 * @param onStatusChange Callback that is executed when the idle state changes
 */
export const initIdleTracker = (onStatusChange: (isIdle: boolean, duration: number) => void) => {
  
  const resetTimer = () => {
    if (isUserIdle) {
      const duration = performance.now() - idleStartTime;
      isUserIdle = false;
      onStatusChange(false, duration); 
    }

    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(goIdle, IDLE_THRESHOLD);
  };

  const goIdle = () => {
    isUserIdle = true;
    idleStartTime = performance.now();
    onStatusChange(true, 0);
  };

  const activityEvents = [
    'mousedown', 
    'mousemove', 
    'keypress', 
    'scroll', 
    'touchstart',
    'wheel'
  ];

  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, resetTimer, { passive: true });
  });

  resetTimer();
};

export const getIsIdle = () => isUserIdle;