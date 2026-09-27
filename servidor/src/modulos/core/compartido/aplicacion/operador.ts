import type { ContextoEmpresa } from './contexto-empresa.js';

/** Quien ejecuta un caso de uso: su usuario, la empresa con la que trabaja y si es de soporte. */
export interface Operador extends ContextoEmpresa {
  /** Soporte (superacceso): ve todas las empresas, aunque no sea miembro de ellas. */
  esSuperacceso: boolean;
}
