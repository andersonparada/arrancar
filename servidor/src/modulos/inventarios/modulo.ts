import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { configuracionDeInventarios } from './configuracion.js';
import { rutasDeUnidades } from './composicion/unidades.js';
import { rutasDeCategorias } from './composicion/categorias.js';
import { rutasDeArticulos } from './composicion/articulos.js';
// generador: importaciones

/** Existencias, kardex y costeo de la mercadería, materias primas y suministros de la empresa Ver `docs/modulos/inventarios.md`. */
export const moduloInventarios: DefinicionModulo = {
  clave: 'inventarios',
  nombre: 'Inventarios',
  descripcion: 'Existencias, kardex y costeo de la mercadería, materias primas y suministros de la empresa',
  dependeDe: ['libro-de-compras'],
  permisos: [
    { clave: 'inventarios.unidades.ver', descripcion: 'Ver unidades de medida' },
    { clave: 'inventarios.unidades.crear', descripcion: 'Registrar unidades de medida' },
    { clave: 'inventarios.unidades.editar', descripcion: 'Editar, inactivar y reactivar unidades de medida' },
    { clave: 'inventarios.unidades.importar', descripcion: 'Importar unidades de medida desde Excel' },
    { clave: 'inventarios.unidades.exportar', descripcion: 'Exportar unidades de medida a Excel' },
    {
      clave: 'inventarios.unidades.eliminar',
      descripcion: 'Eliminar unidades de medida que no se usan',
    },
    { clave: 'inventarios.categorias.ver', descripcion: 'Ver categorías' },
    { clave: 'inventarios.categorias.crear', descripcion: 'Registrar categorías' },
    { clave: 'inventarios.categorias.editar', descripcion: 'Editar, inactivar y reactivar categorías' },
    { clave: 'inventarios.categorias.importar', descripcion: 'Importar categorías desde Excel' },
    { clave: 'inventarios.categorias.exportar', descripcion: 'Exportar categorías a Excel' },
    {
      clave: 'inventarios.categorias.eliminar',
      descripcion: 'Eliminar categorías que no se usan',
    },
    { clave: 'inventarios.articulos.ver', descripcion: 'Ver artículos' },
    { clave: 'inventarios.articulos.crear', descripcion: 'Registrar artículos' },
    { clave: 'inventarios.articulos.editar', descripcion: 'Editar, inactivar y reactivar artículos' },
    { clave: 'inventarios.articulos.importar', descripcion: 'Importar artículos desde Excel' },
    { clave: 'inventarios.articulos.exportar', descripcion: 'Exportar artículos a Excel' },
    {
      clave: 'inventarios.articulos.eliminar',
      descripcion: 'Eliminar artículos que no se usan',
    },
    // generador: permisos
  ],
  configuracion: configuracionDeInventarios,
  rutas: rutasDelModulo([
    rutasDeUnidades(),
    rutasDeCategorias(),
    rutasDeArticulos(),
    // generador: rutas
  ]),
};
