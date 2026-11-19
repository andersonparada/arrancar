import { Calculator, FileX2, Gauge, Inbox, Landmark, ListChecks, RefreshCcw, Wallet } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CAJA_CHICA, VENTANAS_CAJA_CHICA } from './textos';
// generador: importaciones

const PERMISO_DE_REPORTES = 'caja-chica.reportes.ver';

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
    {
      path: '/caja-chica/reportes/pendientes-de-reponer',
      name: 'caja-chica.reportes.pendientes-de-reponer',
      component: () => import('./paginas/PendientesDeReponer.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CAJA_CHICA.pendientesDeReponer.titulo },
    },
    {
      path: '/caja-chica/reportes/reposiciones',
      name: 'caja-chica.reportes.reposiciones',
      component: () => import('./paginas/ReposicionesDelPeriodo.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CAJA_CHICA.reposicionesDelPeriodo.titulo },
    },
    {
      path: '/caja-chica/reportes/sin-documento-fiscal',
      name: 'caja-chica.reportes.sin-documento-fiscal',
      component: () => import('./paginas/GastosSinDocumento.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CAJA_CHICA.gastosSinDocumento.titulo },
    },
    {
      path: '/caja-chica/reportes/estado-de-fondos',
      name: 'caja-chica.reportes.estado-de-fondos',
      component: () => import('./paginas/EstadoDeLosFondos.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CAJA_CHICA.estadoDeLosFondos.titulo },
    },
    {
      path: '/caja-chica/reportes/arqueos',
      name: 'caja-chica.reportes.arqueos',
      component: () => import('./paginas/ArqueosDelPeriodo.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CAJA_CHICA.arqueosDelPeriodo.titulo },
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
        {
          titulo: VENTANAS_CAJA_CHICA.pendientesDeReponer.titulo,
          ruta: '/caja-chica/reportes/pendientes-de-reponer',
          icono: ListChecks,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        {
          titulo: VENTANAS_CAJA_CHICA.reposicionesDelPeriodo.titulo,
          ruta: '/caja-chica/reportes/reposiciones',
          icono: RefreshCcw,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        {
          titulo: VENTANAS_CAJA_CHICA.gastosSinDocumento.titulo,
          ruta: '/caja-chica/reportes/sin-documento-fiscal',
          icono: FileX2,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        {
          titulo: VENTANAS_CAJA_CHICA.estadoDeLosFondos.titulo,
          ruta: '/caja-chica/reportes/estado-de-fondos',
          icono: Gauge,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        {
          titulo: VENTANAS_CAJA_CHICA.arqueosDelPeriodo.titulo,
          ruta: '/caja-chica/reportes/arqueos',
          icono: Calculator,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        // generador: menu
      ],
    },
  ],
};
