import { BehaviorTracker } from './core/tracker.js';

export { BehaviorTracker };

/**
 * @param targets Array de strings que coinciden con data-behavior="..."
 * Ejemplo: initBehavior(['cta-principal', 'newsletter', 'compra'])
 */
export const initBehavior = (targets: string[] = ['cta']) => {
  const tracker = new BehaviorTracker(targets);
  tracker.start();
  return tracker;
};