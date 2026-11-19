import { Landmark } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_ACTIVOS_FIJOS } from './textos';
import { CalendarCheck, Inbox, Package, Scale, Shapes } from 'lucide-vue-next';
import { VENTANAS_ACTIVOS_FIJOS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Activos fijos. Un grupo sin opciones no se muestra. */
export const moduloActivosFijos: DefinicionModuloCliente = {
  clave: 'activos-fijos',
  rutas: [
    {
      path: '/activos-fijos/clases',
      name: 'activos-fijos.clases',
      component: () => import('./paginas/ListaDeClases.vue'),
      meta: { permiso: 'activos-fijos.clases.ver', titulo: VENTANAS_ACTIVOS_FIJOS.clases.titulo },
    },
    {
      path: '/activos-fijos/activos',
      name: 'activos-fijos.activos',
      component: () => import('./paginas/ListaDeActivos.vue'),
      meta: { permiso: 'activos-fijos.activos.ver', titulo: VENTANAS_ACTIVOS_FIJOS.activos.titulo },
    },
    {
      path: '/activos-fijos/activos/nuevo',
      name: 'activos-fijos.activos.nuevo',
      component: () => import('./paginas/FormularioDeActivo.vue'),
      meta: { permiso: 'activos-fijos.activos.crear', titulo: VENTANAS_ACTIVOS_FIJOS.activos.nuevo },
    },
    {
      path: '/activos-fijos/activos/:activoId',
      name: 'activos-fijos.activos.ficha',
      component: () => import('./paginas/FichaDeActivo.vue'),
      props: true,
      meta: { permiso: 'activos-fijos.activos.ver', titulo: VENTANAS_ACTIVOS_FIJOS.activos.titulo },
    },
    {
      path: '/activos-fijos/por-capitalizar',
      name: 'activos-fijos.por-capitalizar',
      component: () => import('./paginas/PorCapitalizar.vue'),
      meta: { permiso: 'activos-fijos.bandeja.ver', titulo: VENTANAS_ACTIVOS_FIJOS.porCapitalizar.titulo },
    },
    {
      path: '/activos-fijos/depreciacion',
      name: 'activos-fijos.depreciacion',
      component: () => import('./paginas/CierreDeDepreciacion.vue'),
      meta: { permiso: 'activos-fijos.depreciacion.ver', titulo: VENTANAS_ACTIVOS_FIJOS.depreciacion.titulo },
    },
    {
      path: '/activos-fijos/saldos-iniciales',
      name: 'activos-fijos.saldos-iniciales',
      component: () => import('./paginas/ListaDeSaldosIniciales.vue'),
      meta: { permiso: 'activos-fijos.saldos-iniciales.ver', titulo: VENTANAS_ACTIVOS_FIJOS.saldosIniciales.titulo },
    },
    {
      path: '/activos-fijos/saldos-iniciales/nuevo',
      name: 'activos-fijos.saldos-iniciales.nuevo',
      component: () => import('./paginas/FormularioDeSaldoInicial.vue'),
      meta: { permiso: 'activos-fijos.saldos-iniciales.crear', titulo: VENTANAS_ACTIVOS_FIJOS.saldosIniciales.nuevo },
    },
    {
      path: '/activos-fijos/saldos-iniciales/:activoId/editar',
      name: 'activos-fijos.saldos-iniciales.editar',
      component: () => import('./paginas/FormularioDeSaldoInicial.vue'),
      props: true,
      meta: { permiso: 'activos-fijos.saldos-iniciales.editar', titulo: VENTANAS_ACTIVOS_FIJOS.saldosIniciales.editar },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'activos-fijos',
      titulo: NOMBRE_ACTIVOS_FIJOS,
      icono: Landmark,
      entradas: [
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.activos.titulo,
          ruta: '/activos-fijos/activos',
          icono: Package,
          seccion: 'operacion',
          permiso: 'activos-fijos.activos.ver',
        },
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.porCapitalizar.titulo,
          ruta: '/activos-fijos/por-capitalizar',
          icono: Inbox,
          seccion: 'operacion',
          permiso: 'activos-fijos.bandeja.ver',
        },
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.depreciacion.titulo,
          ruta: '/activos-fijos/depreciacion',
          icono: CalendarCheck,
          seccion: 'operacion',
          permiso: 'activos-fijos.depreciacion.ver',
        },
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.saldosIniciales.titulo,
          ruta: '/activos-fijos/saldos-iniciales',
          icono: Scale,
          seccion: 'administracion',
          permiso: 'activos-fijos.saldos-iniciales.ver',
        },
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.clases.titulo,
          ruta: '/activos-fijos/clases',
          icono: Shapes,
          seccion: 'administracion',
          permiso: 'activos-fijos.clases.ver',
        },
        // generador: menu
      ],
    },
  ],
};
