import { Warehouse } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_INVENTARIOS } from './textos';
import { Ruler } from 'lucide-vue-next';
import { VENTANAS_INVENTARIOS } from './textos';
import { Boxes } from 'lucide-vue-next';
import { Package } from 'lucide-vue-next';
// generador: importaciones

/** Rutas y menú del módulo Inventarios. Un grupo sin opciones no se muestra. */
export const moduloInventarios: DefinicionModuloCliente = {
  clave: 'inventarios',
  rutas: [
    {
      path: '/inventarios/unidades',
      name: 'inventarios.unidades',
      component: () => import('./paginas/ListaDeUnidades.vue'),
      meta: { permiso: 'inventarios.unidades.ver', titulo: VENTANAS_INVENTARIOS.unidades.titulo },
    },
    {
      path: '/inventarios/categorias',
      name: 'inventarios.categorias',
      component: () => import('./paginas/ListaDeCategorias.vue'),
      meta: { permiso: 'inventarios.categorias.ver', titulo: VENTANAS_INVENTARIOS.categorias.titulo },
    },
    {
      path: '/inventarios/articulos',
      name: 'inventarios.articulos',
      component: () => import('./paginas/ListaDeArticulos.vue'),
      meta: { permiso: 'inventarios.articulos.ver', titulo: VENTANAS_INVENTARIOS.articulos.titulo },
    },
    {
      path: '/inventarios/articulos/nuevo',
      name: 'inventarios.articulos.nuevo',
      component: () => import('./paginas/FormularioDeArticulo.vue'),
      meta: { permiso: 'inventarios.articulos.crear', titulo: VENTANAS_INVENTARIOS.articulos.nuevo },
    },
    {
      path: '/inventarios/articulos/:articuloId',
      name: 'inventarios.articulos.ficha',
      component: () => import('./paginas/FichaDeArticulo.vue'),
      props: true,
      meta: { permiso: 'inventarios.articulos.ver', titulo: VENTANAS_INVENTARIOS.articulos.titulo },
    },
    {
      path: '/inventarios/articulos/:articuloId/editar',
      name: 'inventarios.articulos.editar',
      component: () => import('./paginas/FormularioDeArticulo.vue'),
      props: true,
      meta: { permiso: 'inventarios.articulos.editar', titulo: VENTANAS_INVENTARIOS.articulos.editar },
    },
    {
      path: '/inventarios/bodegas',
      name: 'inventarios.bodegas',
      component: () => import('./paginas/ListaDeBodegas.vue'),
      meta: { permiso: 'inventarios.bodegas.ver', titulo: VENTANAS_INVENTARIOS.bodegas.titulo },
    },
    {
      path: '/inventarios/bodegas/nuevo',
      name: 'inventarios.bodegas.nuevo',
      component: () => import('./paginas/FormularioDeBodega.vue'),
      meta: { permiso: 'inventarios.bodegas.crear', titulo: VENTANAS_INVENTARIOS.bodegas.nuevo },
    },
    {
      path: '/inventarios/bodegas/:bodegaId',
      name: 'inventarios.bodegas.ficha',
      component: () => import('./paginas/FichaDeBodega.vue'),
      props: true,
      meta: { permiso: 'inventarios.bodegas.ver', titulo: VENTANAS_INVENTARIOS.bodegas.titulo },
    },
    {
      path: '/inventarios/bodegas/:bodegaId/editar',
      name: 'inventarios.bodegas.editar',
      component: () => import('./paginas/FormularioDeBodega.vue'),
      props: true,
      meta: { permiso: 'inventarios.bodegas.editar', titulo: VENTANAS_INVENTARIOS.bodegas.editar },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'inventarios',
      titulo: NOMBRE_INVENTARIOS,
      icono: Warehouse,
      entradas: [
        {
          titulo: VENTANAS_INVENTARIOS.unidades.titulo,
          ruta: '/inventarios/unidades',
          icono: Ruler,
          seccion: 'administracion',
          permiso: 'inventarios.unidades.ver',
        },
        {
          titulo: VENTANAS_INVENTARIOS.categorias.titulo,
          ruta: '/inventarios/categorias',
          icono: Boxes,
          seccion: 'administracion',
          permiso: 'inventarios.categorias.ver',
        },
        {
          titulo: VENTANAS_INVENTARIOS.articulos.titulo,
          ruta: '/inventarios/articulos',
          icono: Package,
          seccion: 'administracion',
          permiso: 'inventarios.articulos.ver',
        },
        {
          titulo: VENTANAS_INVENTARIOS.bodegas.titulo,
          ruta: '/inventarios/bodegas',
          icono: Warehouse,
          seccion: 'administracion',
          permiso: 'inventarios.bodegas.ver',
        },
        // generador: menu
      ],
    },
  ],
};
