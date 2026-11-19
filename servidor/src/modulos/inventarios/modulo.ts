import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { configuracionDeInventarios } from './configuracion.js';
import { rutasDeUnidades } from './composicion/unidades.js';
import { rutasDeCategorias } from './composicion/categorias.js';
import { rutasDeArticulos } from './composicion/articulos.js';
import { rutasDeBodegas } from './composicion/bodegas.js';
import { rutasDeAccesosABodegas } from './composicion/accesos-a-bodegas.js';
import { ALCANCE_DE_BODEGAS } from './infraestructura/persistencia/accesos-a-bodegas.tablas.js';
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
    { clave: 'inventarios.bodegas.ver', descripcion: 'Ver las bodegas que se le asignaron' },
    { clave: 'inventarios.bodegas.ver-todas', descripcion: 'Ver y usar todas las bodegas de la empresa' },
    { clave: 'inventarios.bodegas.crear', descripcion: 'Registrar bodegas' },
    { clave: 'inventarios.bodegas.editar', descripcion: 'Editar, inactivar y reactivar bodegas' },
    { clave: 'inventarios.bodegas.eliminar', descripcion: 'Eliminar bodegas que no se usan' },
    {
      clave: 'inventarios.bodegas.asignar',
      descripcion: 'Dar y quitar a los usuarios el acceso a las bodegas (ve todas en esa ventana)',
    },
    { clave: 'inventarios.bodegas.importar', descripcion: 'Importar bodegas desde Excel' },
    { clave: 'inventarios.bodegas.exportar', descripcion: 'Exportar bodegas a Excel' },
    // generador: permisos
  ],
  recursosConAlcance: [
    {
      clave: 'inventarios.bodegas',
      descripcion: 'Bodegas',
      permisoVerTodos: 'inventarios.bodegas.ver-todas',
      permisoAsignar: 'inventarios.bodegas.asignar',
      alcance: ALCANCE_DE_BODEGAS,
    },
  ],
  configuracion: configuracionDeInventarios,
  rutas: rutasDelModulo([
    rutasDeUnidades(),
    rutasDeCategorias(),
    rutasDeArticulos(),
    rutasDeBodegas(),
    rutasDeAccesosABodegas(),
    // generador: rutas
  ]),
};
