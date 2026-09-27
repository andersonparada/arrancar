import type { DefinicionModuloCliente } from './core/tipos';
import { moduloCore } from './core/modulo';
import { moduloEmpresas } from './empresas/modulo';
import { moduloTerceros } from './terceros/modulo';
// generador: importaciones

/** Módulos del frontend, en el orden del menú; el core va al final (Cuenta y Soporte). */
export const modulosCliente: readonly DefinicionModuloCliente[] = [
  moduloEmpresas,
  moduloTerceros,
  // generador: modulos
  moduloCore,
];
