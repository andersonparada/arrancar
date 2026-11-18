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

  /**
   * Corre el trabajo con una empresa **recién creada** de la misma cuenta y usuario como activa. Existe solo porque la
   * seguridad por filas únicamente deja escribir en la empresa activa: quien registra una empresa debe sembrar sus datos
   * iniciales en la misma transacción (así importar varias empresas es todo o nada). Por eso exige que la empresa no
   * exista aún en la base ni se haya abierto antes en la transacción; cualquier otra, con o sin acceso del usuario,
   * se rechaza con `EmpresaNoEsNueva`, y una cuenta o usuario distintos con `ContextoDistintoEnLaTransaccion`.
   * Trabaja en un punto de guardado y, al terminar, devuelve la empresa anterior. Sin transacción, abre una.
   */
  ejecutarEnEmpresaNueva<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado>;
}
