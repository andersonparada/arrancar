import { HandCoins, Inbox } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from './textos';

const ventana = VENTANAS_CUENTAS_POR_LIQUIDAR.anticipos;
const PERMISO_DE_VER = 'cuentas-por-liquidar.anticipos.ver';
const conId = ({ params }: { params: Record<string, string | string[]> }) => ({ id: String(params.id) });

/** Los anticipos (lista, ficha, liquidación e impresión) y la bandeja de documentos. */
export const rutasDeAnticipos: RouteRecordRaw[] = [
  {
    path: '/cuentas-por-liquidar/anticipos',
    name: 'cuentas-por-liquidar.anticipos',
    component: () => import('./paginas/ListaDeAnticipos.vue'),
    meta: { permiso: PERMISO_DE_VER, titulo: ventana.titulo },
  },
  {
    path: '/cuentas-por-liquidar/anticipos/:id',
    name: 'cuentas-por-liquidar.anticipos.ficha',
    component: () => import('./paginas/FichaDeAnticipo.vue'),
    props: conId,
    meta: { permiso: PERMISO_DE_VER, titulo: ventana.ficha },
  },
  {
    path: '/cuentas-por-liquidar/anticipos/:id/liquidar',
    name: 'cuentas-por-liquidar.anticipos.liquidar',
    component: () => import('./paginas/LiquidarAnticipo.vue'),
    props: conId,
    meta: { permiso: 'cuentas-por-liquidar.anticipos.liquidar', titulo: ventana.liquidar },
  },
  {
    path: '/cuentas-por-liquidar/anticipos/:id/imprimir',
    name: 'cuentas-por-liquidar.anticipos.imprimir',
    component: () => import('./paginas/ImpresionDeLiquidacion.vue'),
    props: conId,
    meta: { permiso: PERMISO_DE_VER, titulo: ventana.imprimir },
  },
  {
    path: '/cuentas-por-liquidar/bandeja',
    name: 'cuentas-por-liquidar.bandeja',
    component: () => import('./paginas/BandejaDeCuentasPorLiquidar.vue'),
    meta: { permiso: PERMISO_DE_VER, titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.bandeja.titulo },
  },
];

/** Operación: sin Excel (importar y exportar son de administración). */
export const entradasDeAnticipos: EntradaMenu[] = [
  {
    titulo: ventana.titulo,
    ruta: '/cuentas-por-liquidar/anticipos',
    icono: HandCoins,
    seccion: 'operacion',
    permiso: PERMISO_DE_VER,
  },
  {
    titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.bandeja.titulo,
    ruta: '/cuentas-por-liquidar/bandeja',
    icono: Inbox,
    seccion: 'operacion',
    permiso: PERMISO_DE_VER,
  },
];
