import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Agrupa las lecturas y escrituras de un caso de uso en una sola transacción,
 * ligada a la empresa y al usuario del contexto: o se guarda todo o no se guarda
 * nada, y solo se ven las filas que ese contexto puede ver.
 */
export interface UnidadDeTrabajo {
  ejecutar<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado>;

  /**
   * Corre el trabajo en un punto de guardado dentro de la transacción en curso: si falla, deshace solo lo suyo
   * (la transacción sigue sana para seguir trabajando) y vuelve a lanzar el error. Sin transacción en curso, solo corre el trabajo.
   */
  aislar<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado>;
}
