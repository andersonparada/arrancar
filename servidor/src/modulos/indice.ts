import { moduloCore } from './core/modulo.js';
import type { DefinicionModulo } from './core/modulos-sistema/definicion-modulo.js';
import { moduloEmpresas } from './empresas/modulo.js';

/** Módulos instalados. Para agregar uno nuevo basta con sumarlo a esta lista. */
export const definicionesModulos: readonly DefinicionModulo[] = [moduloCore, moduloEmpresas];
