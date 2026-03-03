import { BehaviorTracker } from './core/tracker.js';

export { BehaviorTracker };

// Función rápida para que el usuario solo tenga que poner: initBehavior()
export const initBehavior = () => {
  const tracker = new BehaviorTracker();
  tracker.start();
  return tracker;
};