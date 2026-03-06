import { calculateTTA, trackHoverStart } from '../metrics/tta.js';
import { trackMissClick } from '../metrics/missclicks.js';
import { trackScrollDepth } from '../metrics/scroll.js';
import { initIdleTracker } from '../metrics/idle.js';

// --- NUEVAS INTERFACES PARA EL CONSTRUCTOR ---
interface TrackerProviders {
  discord?: string;
  slack?: string;
  telegram?: {
    token: string;
    chatId: string;
  };
}

interface TrackerConfig {
  targets: string[];
  providers?: TrackerProviders; 
  debug?: boolean;
}

export class BehaviorTracker {
  private startTime: number;
  private config: TrackerConfig; 
  private capturedTTA: Set<string> = new Set();
  private sessionLogs: any[] = [];
  private lastMilestoneReached: number = 0;
  private totalIdleAccumulated: number = 0;

  /**
   * Constructor con soporte híbrido para evitar errores de build
   * Acepta: new BehaviorTracker(['target']) 
   * O acepta: new BehaviorTracker({ targets: ['target'], debug: true })
   */
  constructor(configOrTargets: TrackerConfig | string[]) {
    this.startTime = performance.now();

    // Normalización de la configuración
    if (Array.isArray(configOrTargets)) {
      this.config = { targets: configOrTargets };
    } else {
      this.config = configOrTargets;
    }
    
    initIdleTracker((isIdle, duration) => {
      if (isIdle) {
        if (this.config.debug) console.log("%c💤 [Behavior.js] Status: Usuario Inactivo", "color: #9ca3af");
      } else {
        this.totalIdleAccumulated += duration;
        if (this.config.debug) console.log(`%c✨ [Behavior.js] Status: Usuario regresó (Ausente: ${(duration/1000).toFixed(2)}s)`, "color: #10b981");
      }
    });

    this.setupExitListener();
  }

  private setupExitListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReport();
      }
    });

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
    if (this.config.debug) console.log("🛡️ Behavior.js: Monitor activo. Rastreando:", this.config.targets);

    window.addEventListener('mouseover', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      this.config.targets.forEach(name => {
        const container = target.closest(`[data-behavior="${name}"]`);
        if (container) {
          trackHoverStart(name, this.startTime);
        }
      });
    }, { passive: true });

    window.addEventListener('click', (event: MouseEvent) => {
      const ttaResult = calculateTTA(event, this.config.targets, this.startTime, this.capturedTTA);
      if (ttaResult) {
        this.capturedTTA.add(ttaResult.action);
        this.addLog('tta', ttaResult);
      }

      const mcResult = trackMissClick(event, this.config.targets);
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
    
    if (this.config.debug) {
        const color = type === 'missclick' ? '#ff4757' : type === 'tta' ? '#2ed573' : '#1e90ff';
        console.log(`%c📊 [Behavior.js] ${type.toUpperCase()}:`, `color: ${color}; font-weight: bold;`, data);
    }
  }

  public async sendReport(): Promise<void> {
    if (this.sessionLogs.length === 0) return;

    const ttaEvents = this.sessionLogs.filter(l => l.type === 'tta');
    const avgDiscovery = ttaEvents.length > 0 ? ttaEvents.reduce((acc, curr) => acc + curr.visualDiscoveryMs, 0) / ttaEvents.length : 0;
    const avgHesitation = ttaEvents.length > 0 ? ttaEvents.reduce((acc, curr) => acc + curr.cognitiveHesitationMs, 0) / ttaEvents.length : 0;

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
      events: this.sessionLogs 
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const fileName = `session-${Date.now()}.json`;

    if (this.config.providers) {
      if (this.config.providers.discord) {
        const fd = new FormData();
        fd.append('content', `📊 **Behavior.js:** Nueva sesión de ${report.metadata.screenSize}`);
        fd.append('file', blob, fileName);
        fetch(this.config.providers.discord, { method: 'POST', body: fd, keepalive: true });
      }

      if (this.config.providers.telegram) {
        const { token, chatId } = this.config.providers.telegram;
        const fd = new FormData();
        fd.append('chat_id', chatId);
        fd.append('document', blob, fileName);
        fd.append('caption', `📊 *Behavior.js:* Nueva sesión\nAcciones: ${report.summary.successfulActionsCount}`);
        fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: fd, keepalive: true });
      }

      if (this.config.providers.slack) {
        fetch(this.config.providers.slack, {
          method: 'POST',
          body: JSON.stringify({ text: `📊 *Behavior.js*: Nueva sesión detectada en ${window.location.hostname}` }),
          keepalive: true
        });
      }
    }

    try {
      const history = JSON.parse(localStorage.getItem('behavior_history') || '[]');
      history.push(report);
      localStorage.setItem('behavior_history', JSON.stringify(history.slice(-10)));
    } catch (e) {}

    if (this.config.debug) console.log("✅ Reporte procesado y enviado.");
  }
}