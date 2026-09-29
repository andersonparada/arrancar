import { Hourglass, ListOrdered, Percent, Sigma, Waves, ScrollText } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_BANCOS } from './textos';

/** Las entradas de la sección Reportes del menú de Bancos (aparte para que `modulo.ts` no crezca de más). */
export const ENTRADAS_DE_REPORTES: EntradaMenu[] = [
  {
    titulo: VENTANAS_BANCOS.movimientos.titulo,
    ruta: '/bancos/movimientos',
    icono: ScrollText,
    seccion: 'reportes',
    permiso: 'bancos.movimientos.ver',
  },
  {
    titulo: VENTANAS_BANCOS.correlativos.titulo,
    ruta: '/bancos/correlativos',
    icono: ListOrdered,
    seccion: 'reportes',
    permiso: 'bancos.movimientos.ver',
  },
  {
    titulo: VENTANAS_BANCOS.chequesCaducos.titulo,
    ruta: '/bancos/cheques-caducos',
    icono: Hourglass,
    seccion: 'reportes',
    permiso: 'bancos.cheques-caducos.ver',
  },
  {
    titulo: VENTANAS_BANCOS.flujoDeEfectivo.titulo,
    ruta: '/bancos/flujo-de-efectivo',
    icono: Waves,
    seccion: 'reportes',
    permiso: 'bancos.flujo-de-efectivo.ver',
  },
  {
    titulo: VENTANAS_BANCOS.movimientosPorConcepto.titulo,
    ruta: '/bancos/movimientos-por-concepto',
    icono: Sigma,
    seccion: 'reportes',
    permiso: 'bancos.movimientos.ver',
  },
  {
    titulo: VENTANAS_BANCOS.intereses.titulo,
    ruta: '/bancos/intereses-y-retenciones',
    icono: Percent,
    seccion: 'reportes',
    permiso: 'bancos.intereses.ver',
  },
];

/** Las rutas de los reportes que se abren en su propia página. */
export const RUTAS_DE_REPORTES: RouteRecordRaw[] = [
  {
    path: '/bancos/flujo-de-efectivo',
    name: 'bancos.flujo-de-efectivo',
    component: () => import('./paginas/ReporteDeFlujoDeEfectivo.vue'),
    meta: { permiso: 'bancos.flujo-de-efectivo.ver', titulo: VENTANAS_BANCOS.flujoDeEfectivo.titulo },
  },
  {
    path: '/bancos/movimientos-por-concepto',
    name: 'bancos.movimientos-por-concepto',
    component: () => import('./paginas/ReporteDeMovimientosPorConcepto.vue'),
    meta: { permiso: 'bancos.movimientos.ver', titulo: VENTANAS_BANCOS.movimientosPorConcepto.titulo },
  },
  {
    path: '/bancos/intereses-y-retenciones',
    name: 'bancos.intereses-y-retenciones',
    component: () => import('./paginas/ReporteDeIntereses.vue'),
    meta: { permiso: 'bancos.intereses.ver', titulo: VENTANAS_BANCOS.intereses.titulo },
  },
];
