import { calculateTTA, trackHoverStart } from '../metrics/tta.js';
import { trackMissClick } from '../metrics/missclicks.js';
import { trackScrollDepth } from '../metrics/scroll.js';
import { initIdleTracker } from '../metrics/idle.js';

export class BehaviorTracker {
  private startTime: number;
  private targets: string[];
  private capturedTTA: Set<string> = new Set();
  private sessionLogs: any[] = [];
  private lastMilestoneReached: number = 0;
  private totalIdleAccumulated: number = 0;

  constructor(targets: string[] = ['cta']) {
    this.startTime = performance.now();
    this.targets = targets;
    
    initIdleTracker((isIdle, duration) => {
      if (isIdle) {
        console.log("%c💤 [Behavior.js] Status: Usuario Inactivo", "color: #9ca3af");
      } else {
        this.totalIdleAccumulated += duration;
        console.log(`%c✨ [Behavior.js] Status: Usuario regresó (Ausente: ${(duration/1000).toFixed(2)}s)`, "color: #10b981");
      }
    });

    this.setupExitListener();
  }

  private setupExitListener(): void {
    // Detectar cuando el usuario cambia de pestaña o cierra
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReport();
      }
    });

    // Respaldo para cierre de ventana
    window.addEventListener('beforeunload', () => {
      this.sendReport();
    });
  }

  private setupScrollListener(): void {
    window.addEventListener('scroll', () => {
      const scrollData = trackScrollDepth();
      if (scrollData) {
        const milestones = [25, 50, 75, 100];
        const currentMilestone = milestones.filter(m => scrollData.maxPercentage >= m).pop();

        if (currentMilestone && currentMilestone > this.lastMilestoneReached) {
          this.lastMilestoneReached = currentMilestone;
          const timeSinceStart = ((performance.now() - this.startTime) / 1000).toFixed(2);

          this.addLog('scroll', {
            milestone: `${currentMilestone}%`,
            section: scrollData.currentSection,
            timeElapsed: `${timeSinceStart}s`,
          });
        }
      }
    }, { passive: true });
  }

  public start(): void {
    console.log("🛡️ Behavior.js: Monitor activo. Rastreando:", this.targets);

    window.addEventListener('mouseover', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      this.targets.forEach(name => {
        const container = target.closest(`[data-behavior="${name}"]`);
        if (container) {
          trackHoverStart(name, this.startTime);
        }
      });
    }, { passive: true });

    window.addEventListener('click', (event: MouseEvent) => {
      const ttaResult = calculateTTA(event, this.targets, this.startTime, this.capturedTTA);
      if (ttaResult) {
        this.capturedTTA.add(ttaResult.action);
        this.addLog('tta', ttaResult);
      }

      const mcResult = trackMissClick(event, this.targets);
      if (mcResult) {
        this.addLog('missclick', mcResult);
      }
    });

    this.setupScrollListener();
  }

  private addLog(type: string, data: any): void {
    const now = performance.now();
    const rawTime = now - this.startTime;
    const activeTime = rawTime - this.totalIdleAccumulated;

    const entry = {
      type,
      ...data,
      sessionMetrics: {
        activeTimeMs: Math.round(activeTime),
        idleTimeAppliedMs: Math.round(this.totalIdleAccumulated)
      },
      timestamp: new Date().toISOString()
    };
    
    this.sessionLogs.push(entry);
    const color = type === 'missclick' ? '#ff4757' : type === 'tta' ? '#2ed573' : '#1e90ff';
    console.log(`%c📊 [Behavior.js] ${type.toUpperCase()}:`, `color: ${color}; font-weight: bold;`, data);
  }

  /**
   * Genera el JSON final con el resumen Y todas las acciones detalladas
   */
  public sendReport(): void {
    if (this.sessionLogs.length === 0) return;

    // 1. Cálculos de promedios para el resumen rápido
    const ttaEvents = this.sessionLogs.filter(l => l.type === 'tta');
    
    const avgDiscovery = ttaEvents.length > 0 
      ? ttaEvents.reduce((acc, curr) => acc + curr.visualDiscoveryMs, 0) / ttaEvents.length 
      : 0;

    const avgHesitation = ttaEvents.length > 0 
      ? ttaEvents.reduce((acc, curr) => acc + curr.cognitiveHesitationMs, 0) / ttaEvents.length 
      : 0;

    // 2. Construcción del objeto de reporte completo
    const report = {
      metadata: {
        date: new Date().toISOString(),
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent
      },
      summary: {
        totalTimeSeconds: Number(((performance.now() - this.startTime) / 1000).toFixed(2)),
        totalIdleTimeMs: Math.round(this.totalIdleAccumulated),
        totalEvents: this.sessionLogs.length,
        missClicksCount: this.sessionLogs.filter(l => l.type === 'missclick').length,
        successfulActionsCount: this.capturedTTA.size,
        maxScrollDepthReached: `${this.lastMilestoneReached}%`,
        avgVisualDiscoveryMs: Math.round(avgDiscovery),
        avgCognitiveHesitationMs: Math.round(avgHesitation)
      },
      // AQUÍ ESTÁ TODO EL RASTRO DE ACCIONES:
      events: this.sessionLogs 
    };

    // 3. Persistencia en LocalStorage (Mantenemos historial de 10 sesiones)
    try {
      const history = JSON.parse(localStorage.getItem('behavior_history') || '[]');
      history.push(report);
      // Guardamos las últimas 10 para no saturar el storage
      localStorage.setItem('behavior_history', JSON.stringify(history.slice(-10)));
    } catch (e) {
      console.error("Error guardando reporte en LocalStorage", e);
    }
    
    // 4. Feedback visual en consola para tus pruebas
    console.group("📦 BEHAVIOR.JS: REPORTE DE SESIÓN COMPLETO");
    console.log("Resumen Ejecutivo:", report.summary);
    console.log("Timeline de Acciones:", report.events); // Aquí verás cada clic y tta
    console.log("Estado: Guardado en behavior_history");
    console.groupEnd();
  }
}