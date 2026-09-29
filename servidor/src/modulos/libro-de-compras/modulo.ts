import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
// generador: importaciones

/** Registro fiscal de las compras: facturas, notas de credito, IDP y retenciones. Ver `docs/modulos/libro-de-compras.md`. */
export const moduloLibroDeCompras: DefinicionModulo = {
  clave: 'libro-de-compras',
  nombre: 'Libro de compras',
  descripcion: 'Registro fiscal de las compras: facturas, notas de credito, IDP y retenciones.',
  dependeDe: ['terceros'],
  permisos: [
    // generador: permisos
  ],
  rutas: rutasDelModulo([
    // generador: rutas
  ]),
};
