// Estas interfaces existen para que el IDE (VS Code) 
// entienda qué lleva el objeto de configuración.
interface BehaviorConfig {
  targets: string[];
  debug?: boolean;
  providers: {
    discord?: string;
    slack?: string;
  };
}

/**
 * Inicializa el rastreador de comportamiento.
 * El usuario solo importa esta función.
 */
export function initBehavior(config: BehaviorConfig): void;