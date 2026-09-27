import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Agrupa las lecturas y escrituras de un caso de uso en una sola transacción,
 * ligada a la empresa y al usuario del contexto: o se guarda todo o no se guarda
 * nada, y solo se ven las filas que ese contexto puede ver.
 */
export interface UnidadDeTrabajo {
  ejecutar<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado>;
}
