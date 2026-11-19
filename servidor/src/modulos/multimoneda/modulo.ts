import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { ordenesDeMultimoneda } from './composicion/ordenes.js';
import { rutasDeTiposDeCambio } from './composicion/tipos-de-cambio.js';
import { configuracionDeMultimoneda } from './configuracion.js';
// generador: importaciones

/** Cuentas, facturas y pagos en dólares u otras monedas, con el tipo de cambio del Banco de Guatemala. Ver `docs/modulos/multimoneda.md`. */
export const moduloMultimoneda: DefinicionModulo = {
  clave: 'multimoneda',
  nombre: 'Multimoneda',
  descripcion: 'Cuentas, facturas y pagos en dólares u otras monedas, con el tipo de cambio del Banco de Guatemala',
  dependeDe: [],
  permisos: [
    { clave: 'multimoneda.tipos-de-cambio.ver', descripcion: 'Ver el reporte de tipos de cambio' },
    { clave: 'multimoneda.tipos-de-cambio.exportar', descripcion: 'Exportar el reporte de tipos de cambio a Excel' },
    // generador: permisos
  ],
  configuracion: configuracionDeMultimoneda,
  rutas: rutasDelModulo([
    ordenesDeMultimoneda(),
    rutasDeTiposDeCambio(),
    // generador: rutas
  ]),
};
