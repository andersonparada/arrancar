import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { configuracionDeActivosFijos } from './configuracion.js';
import { rutasDeActivos } from './composicion/activos.js';
import { rutasDeClases } from './composicion/clases.js';
import { rutasDeBandeja, rutasDeCostos } from './composicion/costos.js';
// generador: importaciones

/** Control, capitalización y depreciación contable y fiscal de los bienes de la empresa. Ver `docs/modulos/activos-fijos.md`. */
export const moduloActivosFijos: DefinicionModulo = {
  clave: 'activos-fijos',
  nombre: 'Activos fijos',
  descripcion: 'Control, capitalización y depreciación contable y fiscal de los bienes de la empresa',
  dependeDe: ['libro-de-compras'],
  permisos: [
    { clave: 'activos-fijos.clases.ver', descripcion: 'Ver clases de activos' },
    { clave: 'activos-fijos.clases.crear', descripcion: 'Registrar clases de activos' },
    { clave: 'activos-fijos.clases.editar', descripcion: 'Editar, inactivar y reactivar clases de activos' },
    {
      clave: 'activos-fijos.clases.eliminar',
      descripcion: 'Eliminar clases de activos sin activos ni conceptos ligados',
    },
    { clave: 'activos-fijos.clases.importar', descripcion: 'Importar clases de activos desde Excel' },
    { clave: 'activos-fijos.clases.exportar', descripcion: 'Exportar clases de activos a Excel' },
    { clave: 'activos-fijos.activos.ver', descripcion: 'Ver activos fijos y su ficha' },
    { clave: 'activos-fijos.activos.crear', descripcion: 'Dar de alta activos fijos' },
    { clave: 'activos-fijos.activos.editar', descripcion: 'Editar activos fijos y marcarlos como ociosos' },
    {
      clave: 'activos-fijos.activos.poner-en-uso',
      descripcion: 'Poner activos fijos en uso (disponibles para uso) y deshacerlo',
    },
    { clave: 'activos-fijos.activos.eliminar', descripcion: 'Eliminar activos fijos sin movimientos' },
    {
      clave: 'activos-fijos.bandeja.ver',
      descripcion: 'Ver la bandeja Por capitalizar (líneas del libro marcadas como activo fijo)',
    },
    {
      clave: 'activos-fijos.bandeja.descartar',
      descripcion: 'Descartar líneas de la bandeja (era gasto) y devolverlas a ella',
    },
    { clave: 'activos-fijos.costos.crear', descripcion: 'Capitalizar líneas de la bandeja y registrar costos a mano' },
    { clave: 'activos-fijos.costos.anular', descripcion: 'Anular costos de los activos' },
    // generador: permisos
  ],
  configuracion: configuracionDeActivosFijos,
  rutas: rutasDelModulo([
    rutasDeClases(),
    rutasDeActivos(),
    rutasDeBandeja(),
    rutasDeCostos(),
    // generador: rutas
  ]),
};
