import { Inbox, Landmark, Wallet } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CAJA_CHICA, VENTANAS_CAJA_CHICA } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Caja chica. Un grupo sin opciones no se muestra. */
export const moduloCajaChica: DefinicionModuloCliente = {
  clave: 'caja-chica',
  rutas: [
    {
      path: '/caja-chica/fondos',
      name: 'caja-chica.fondos',
      component: () => import('./paginas/ListaDeFondos.vue'),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.fondos.titulo },
    },
    {
      path: '/caja-chica/fondos/:id',
      name: 'caja-chica.fondos.ficha',
      component: () => import('./paginas/FichaDeFondo.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.fondos.ficha },
    },
    {
      path: '/caja-chica/bandeja',
      name: 'caja-chica.bandeja',
      component: () => import('./paginas/BandejaDeCajaChica.vue'),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.bandeja.titulo },
    },
    {
      path: '/caja-chica/fondos/:id/reponer',
      name: 'caja-chica.fondos.reponer',
      component: () => import('./paginas/ReposicionDeFondo.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.reposiciones.crear', titulo: 'Reponer el fondo' },
    },
    {
      path: '/caja-chica/fondos/:id/arqueo',
      name: 'caja-chica.fondos.arqueo',
      component: () => import('./paginas/ArqueoDeFondo.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.arqueos.crear', titulo: 'Arqueo del fondo' },
    },
    {
      path: '/caja-chica/fondos/:id/solicitud-de-reposicion',
      name: 'caja-chica.fondos.solicitud',
      component: () => import('./paginas/ImpresionDeSolicitud.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: 'Solicitud de reposición' },
    },
    {
      path: '/caja-chica/reposiciones/:id/imprimir',
      name: 'caja-chica.reposiciones.imprimir',
      component: () => import('./paginas/ImpresionDeReposicion.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: 'Reposición de caja chica' },
    },
    {
      path: '/caja-chica/arqueos/:id/imprimir',
      name: 'caja-chica.arqueos.imprimir',
      component: () => import('./paginas/ImpresionDeArqueo.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: 'Acta de arqueo' },
    },
    {
      path: '/caja-chica/vales-provisionales/:id/liquidar',
      name: 'caja-chica.vales.liquidar',
      component: () => import('./paginas/LiquidacionDeVale.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.vales.liquidar', titulo: 'Liquidar un vale provisional' },
    },
    {
      path: '/caja-chica/vales-provisionales/:id/imprimir',
      name: 'caja-chica.vales.imprimir',
      component: () => import('./paginas/ImpresionDeVale.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: 'Vale provisional' },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'caja-chica',
      titulo: NOMBRE_CAJA_CHICA,
      icono: Wallet,
      entradas: [
        {
          titulo: VENTANAS_CAJA_CHICA.fondos.titulo,
          ruta: '/caja-chica/fondos',
          icono: Landmark,
          seccion: 'operacion',
          permiso: 'caja-chica.fondos.ver',
        },
        {
          titulo: VENTANAS_CAJA_CHICA.bandeja.titulo,
          ruta: '/caja-chica/bandeja',
          icono: Inbox,
          seccion: 'operacion',
          permiso: 'caja-chica.fondos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
