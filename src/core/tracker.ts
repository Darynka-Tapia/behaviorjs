export class BehaviorTracker {
  private startTime: number;
  private hasCapturedAction: boolean = false;

  constructor() {
    this.startTime = performance.now();
  }

  public start(): void {
    console.log("🚀 Behavior.js: Buscando el Call-to-Action...");

    window.addEventListener('click', (event: MouseEvent) => {
      if (this.hasCapturedAction) return;

      // Buscamos el elemento que tenga el atributo 'data-behavior="cta"'
      const target = event.target as HTMLElement;
      const ctaElement = target.closest('[data-behavior="cta"]');

      if (ctaElement) {
        this.hasCapturedAction = true;
        const tta = performance.now() - this.startTime;

        console.log(`🎯 CTA detectado!`);
        
        this.dispatchMetric('time-to-action', {
          milliseconds: Math.round(tta),
          element: ctaElement.tagName.toLowerCase(),
          // Capturamos el ID o una clase para saber CUÁL botón fue
          identifier: ctaElement.id || ctaElement.className || 'unnamed-cta'
        });
      }
    });
  }

  private dispatchMetric(type: string, data: any): void {
    console.log(`📊 [Métrica] ${type}:`, data);
  }
}