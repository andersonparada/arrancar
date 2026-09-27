import type { DefinicionModuloCliente } from './core/tipos';
import { moduloCore } from './core/modulo';
import { moduloEmpresas } from './empresas/modulo';
import { moduloTerceros } from './terceros/modulo';

/** Módulos del frontend. Para agregar uno nuevo basta con sumarlo a esta lista. */
export const modulosCliente: readonly DefinicionModuloCliente[] = [moduloEmpresas, moduloTerceros, moduloCore];
