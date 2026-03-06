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
  
  // Para el cálculo de tiempo real (descontando inactividad)
  private totalIdleAccumulated: number = 0;

  constructor(targets: string[] = ['cta']) {
    this.startTime = performance.now();
    this.targets = targets;
    
    // 1. Iniciamos el sensor de inactividad
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

  /**
   * Configura los eventos para detectar cuándo el usuario deja la página
   */
  private setupExitListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // this.sendReport();
      }
    });

    window.addEventListener('beforeunload', () => {
      // this.sendReport();
    });
  }

  /**
   * Configura el rastreo de scroll por hitos (25%, 50%, 75%, 100%)
   */
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

  /**
   * Inicia el monitoreo global
   */
  public start(): void {
    console.log("🛡️ Behavior.js: Monitor activo. Rastreando:", this.targets);

    // 1. Escuchador de Hover (Sella el descubrimiento visual al entrar)
    window.addEventListener('mouseover', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      this.targets.forEach(name => {
        const container = target.closest(`[data-behavior="${name}"]`);
        if (container) {
          // CLAVE: Pasamos startTime para congelar el descubrimiento visual
          trackHoverStart(name, this.startTime);
        }
      });
    }, { passive: true });

    // 2. Escuchador de Clics (TTA y Miss-clicks)
    window.addEventListener('click', (event: MouseEvent) => {
      const ttaResult = calculateTTA(
        event, 
        this.targets, 
        this.startTime, 
        this.capturedTTA
      );

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

  /**
   * Registra internamente un evento y lo muestra en consola en tiempo real
   */
  private addLog(type: string, data: any): void {
    const now = performance.now();
    const rawTime = now - this.startTime;
    
    // Métrica estrella: Tiempo real descontando inactividad
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
   * Genera el JSON final con toda la data de la sesión
   */
  /*private sendReport(): void {
    if (this.sessionLogs.length === 0) return;

    const report = {
      metadata: {
        date: new Date().toISOString(),
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent
      },
      summary: {
        totalTimeSeconds: Number(((performance.now() - this.startTime) / 1000).toFixed(2)),
        totalIdleTime: (this.totalIdleAccumulated / 1000).toFixed(2) + 's',
        totalEvents: this.sessionLogs.length,
        missClicks: this.sessionLogs.filter(l => l.type === 'missclick').length,
        successfulActions: this.capturedTTA.size,
        maxScrollDepth: `${this.lastMilestoneReached}%`
      },
      events: this.sessionLogs
    };

    console.group("📦 BEHAVIOR.JS: REPORTE DE SESIÓN FINAL");
    console.log("Copia este JSON para analizarlo en tu dashboard:");
    console.log(JSON.stringify(report, null, 2));
    console.groupEnd();

    localStorage.setItem('behavior_last_report', JSON.stringify(report));
  }*/
}