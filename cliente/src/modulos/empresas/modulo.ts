import { Building2, MapPinned } from 'lucide-vue-next';
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
        // generador: menu
      ],
    },
  ],
};
