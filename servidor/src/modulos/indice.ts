import { moduloCore } from './core/modulo.js';
import type { DefinicionModulo } from './core/modulos-sistema/definicion-modulo.js';
import { moduloEmpresas } from './empresas/modulo.js';
import { moduloTerceros } from './terceros/modulo.js';
// generador: importaciones

/** Módulos instalados. `npm run generar -- modulo <clave>` suma uno nuevo en la marca. */
export const definicionesModulos: readonly DefinicionModulo[] = [
  moduloCore,
  moduloEmpresas,
  moduloTerceros,
  // generador: modulos
];
