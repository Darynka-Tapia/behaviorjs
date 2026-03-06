import { calculateTTA } from '../metrics/tta.js';
import { trackMissClick } from '../metrics/missclicks.js';

export class BehaviorTracker {
  private startTime: number;
  private targets: string[];
  private capturedTTA: Set<string> = new Set();
  private sessionLogs: any[] = [];

  constructor(targets: string[] = ['cta']) {
    this.startTime = performance.now();
    this.targets = targets;
    
    // Inicializamos los escuchadores de salida
    this.setupExitListener();
  }

  /**
   * Configura los eventos para detectar cuándo el usuario deja la página
   * y así poder imprimir el reporte final.
   */
  private setupExitListener(): void {
    // Detecta cuando la pestaña se oculta (más fiable en móviles)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // his.sendReport();
      }
    });

    // Detecta el cierre o recarga de la pestaña
    window.addEventListener('beforeunload', () => {
      // this.sendReport();
    });
  }

  /**
   * Inicia el monitoreo global de clics
   */
  public start(): void {
    console.log("🛡️ Behavior.js: Monitor activo. Rastreando:", this.targets);

    window.addEventListener('click', (event: MouseEvent) => {
      // 1. Intentar capturar Time-to-Action
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

      // 2. Intentar capturar Miss-click
      const mcResult = trackMissClick(event, this.targets);
      if (mcResult) {
        this.addLog('missclick', mcResult);
      }
    });
  }

  /**
   * Registra internamente un evento y lo muestra en consola en tiempo real
   */
  private addLog(type: string, data: any): void {
    const entry = {
      type,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    this.sessionLogs.push(entry);
    console.log(`📊 [Behavior.js] ${type.toUpperCase()}:`, data);
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
        totalEvents: this.sessionLogs.length,
        missClicks: this.sessionLogs.filter(l => l.type === 'missclick').length,
        successfulActions: this.capturedTTA.size
      },
      events: this.sessionLogs
    };

    // Imprimimos el resultado para que el desarrollador lo copie
    console.group("📦 BEHAVIOR.JS: REPORTE DE SESIÓN FINAL");
    console.log("Copia este JSON para analizarlo en tu dashboard:");
    console.log(JSON.stringify(report, null, 2));
    console.groupEnd();

    // Guardado preventivo en LocalStorage
    localStorage.setItem('behavior_last_report', JSON.stringify(report));
  }*/
}