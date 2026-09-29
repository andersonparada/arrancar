import { Building2, MapPin, MapPinned, Network } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_EMPRESAS, VENTANAS_EMPRESAS } from './textos';
// generador: importaciones

export const moduloEmpresas: DefinicionModuloCliente = {
  clave: 'empresas',
  rutas: [
    {
      path: '/empresas',
      name: 'empresas',
      component: () => import('./paginas/ListaDeEmpresas.vue'),
      meta: { permiso: 'empresas.ver', titulo: VENTANAS_EMPRESAS.empresas.titulo },
    },
    {
      path: '/empresas/tipos-de-localidad',
      name: 'empresas.tipos-de-localidad',
      component: () => import('./paginas/ListaDeTiposDeLocalidad.vue'),
      meta: { permiso: 'empresas.tipos-de-localidad.ver', titulo: VENTANAS_EMPRESAS.tiposDeLocalidad.titulo },
    },
    {
      path: '/empresas/localidades',
      name: 'empresas.localidades',
      component: () => import('./paginas/ListaDeLocalidades.vue'),
      meta: { permiso: 'empresas.localidades.ver', titulo: VENTANAS_EMPRESAS.localidades.titulo },
    },
    {
      path: '/empresas/localidades/nuevo',
      name: 'empresas.localidades.nuevo',
      component: () => import('./paginas/FormularioDeLocalidad.vue'),
      meta: { permiso: 'empresas.localidades.crear', titulo: VENTANAS_EMPRESAS.localidades.nuevo },
    },
    {
      path: '/empresas/localidades/:localidadId',
      name: 'empresas.localidades.ficha',
      component: () => import('./paginas/FichaDeLocalidad.vue'),
      props: true,
      meta: { permiso: 'empresas.localidades.ver', titulo: VENTANAS_EMPRESAS.localidades.titulo },
    },
    {
      path: '/empresas/localidades/:localidadId/editar',
      name: 'empresas.localidades.editar',
      component: () => import('./paginas/FormularioDeLocalidad.vue'),
      props: true,
      meta: { permiso: 'empresas.localidades.editar', titulo: VENTANAS_EMPRESAS.localidades.editar },
    },
    {
      path: '/empresas/departamentos',
      name: 'empresas.departamentos',
      component: () => import('./paginas/ListaDeDepartamentos.vue'),
      meta: { permiso: 'empresas.departamentos.ver', titulo: VENTANAS_EMPRESAS.departamentos.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'empresas',
      titulo: NOMBRE_EMPRESAS,
      icono: Building2,
      entradas: [
        {
          titulo: VENTANAS_EMPRESAS.empresas.titulo,
          ruta: '/empresas',
          icono: Building2,
          seccion: 'administracion',
          permiso: 'empresas.ver',
        },
        {
          titulo: VENTANAS_EMPRESAS.tiposDeLocalidad.titulo,
          ruta: '/empresas/tipos-de-localidad',
          icono: MapPinned,
          seccion: 'administracion',
          permiso: 'empresas.tipos-de-localidad.ver',
        },
        {
          titulo: VENTANAS_EMPRESAS.localidades.titulo,
          ruta: '/empresas/localidades',
          icono: MapPin,
          seccion: 'administracion',
          permiso: 'empresas.localidades.ver',
        },
        {
          titulo: VENTANAS_EMPRESAS.departamentos.titulo,
          ruta: '/empresas/departamentos',
          icono: Network,
          seccion: 'administracion',
          permiso: 'empresas.departamentos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
