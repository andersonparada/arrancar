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
   * Corre el trabajo con una empresa **recién creada** como activa, con la misma cuenta, usuario y alcance de la
   * transacción en curso (que es obligatoria: sin ella falla). Existe solo porque la seguridad por filas únicamente
   * deja escribir en la empresa activa: quien registra una empresa debe sembrar sus datos iniciales en la misma
   * transacción. Quien llama inserta antes la empresa en `core.empresas` (con la empresa de afuera) y, **antes** de
   * cambiar de empresa, se comprueba que exista con ese id, en la cuenta del contexto y creada en esta transacción;
   * si no, `EmpresaNoEsNueva`. Rechaza también un id repetido en la transacción y otra empresa nueva abierta
   * al mismo tiempo (`EmpresaNuevaYaEnCurso`). Trabaja en un punto de guardado y, al terminar, devuelve la empresa anterior.
   */
  ejecutarEnEmpresaNueva<Resultado>(empresaId: string, trabajo: () => Promise<Resultado>): Promise<Resultado>;
}
