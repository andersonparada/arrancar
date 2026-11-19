import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeAnticiposComponidas } from './composicion/anticipos.js';
import { rutasDeGastosComponidas } from './composicion/gastos.js';
import { configuracionDeCuentasPorLiquidar } from './configuracion.js';
import { PERMISOS_DE_CUENTAS_POR_LIQUIDAR } from './permisos.js';
// generador: importaciones

/**
 * Anticipos de dinero a una persona que debe justificarlos con documentos, con liquidación, devolución o reembolso.
 * Ver `docs/modulos/cuentas-por-liquidar.md`.
 */
export const moduloCuentasPorLiquidar: DefinicionModulo = {
  clave: 'cuentas-por-liquidar',
  nombre: 'Cuentas por liquidar',
  descripcion:
    'Anticipos de dinero a una persona que debe justificarlos con documentos, con liquidación, devolución o reembolso',
  dependeDe: ['libro-de-compras', 'bancos', 'terceros'],
  permisos: PERMISOS_DE_CUENTAS_POR_LIQUIDAR,
  configuracion: configuracionDeCuentasPorLiquidar,
  rutas: rutasDelModulo([
    rutasDeAnticiposComponidas(),
    rutasDeGastosComponidas(),
    // generador: rutas
  ]),
};
