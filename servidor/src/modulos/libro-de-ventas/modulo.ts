import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeConceptosDeIngreso } from './composicion/conceptos-de-ingreso.js';
import { rutasDeDatosFiscalesDeClienteComponidas } from './composicion/datos-fiscales-de-cliente.js';
import { configuracionDeLibroDeVentas } from './configuracion.js';
// generador: importaciones

/** Ventas, retenciones recibidas y libro de ventas de la empresa Ver `docs/modulos/libro-de-ventas.md`. */
export const moduloLibroDeVentas: DefinicionModulo = {
  clave: 'libro-de-ventas',
  nombre: 'Libro de ventas',
  descripcion: 'Ventas, retenciones recibidas y libro de ventas de la empresa',
  dependeDe: ['libro-de-compras'],
  permisos: [
    { clave: 'libro-de-ventas.conceptos-de-ingreso.ver', descripcion: 'Ver conceptos de ingreso' },
    { clave: 'libro-de-ventas.conceptos-de-ingreso.crear', descripcion: 'Registrar conceptos de ingreso' },
    {
      clave: 'libro-de-ventas.conceptos-de-ingreso.editar',
      descripcion: 'Editar, inactivar y reactivar conceptos de ingreso',
    },
    {
      clave: 'libro-de-ventas.conceptos-de-ingreso.eliminar',
      descripcion: 'Eliminar conceptos de ingreso sin documentos',
    },
    {
      clave: 'libro-de-ventas.conceptos-de-ingreso.importar',
      descripcion: 'Importar conceptos de ingreso desde Excel',
    },
    { clave: 'libro-de-ventas.conceptos-de-ingreso.exportar', descripcion: 'Exportar conceptos de ingreso a Excel' },
    // generador: permisos
  ],
  configuracion: configuracionDeLibroDeVentas,
  rutas: rutasDelModulo([
    rutasDeConceptosDeIngreso(),
    rutasDeDatosFiscalesDeClienteComponidas(),
    // generador: rutas
  ]),
};
