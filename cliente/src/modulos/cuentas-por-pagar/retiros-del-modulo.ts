import { Wallet } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_CUENTAS_POR_PAGAR } from './textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.retiros;
const PERMISO_DE_PAGAR = 'cuentas-por-pagar.pagos.pagar-en-efectivo';

/** Los retiros de efectivo, el reparto de su efectivo entre proveedores y los recibos que se imprimen al terminar. */
export const rutasDeRetiros: RouteRecordRaw[] = [
  {
    path: '/cuentas-por-pagar/retiros',
    name: 'cuentas-por-pagar.retiros',
    component: () => import('./paginas/ListaDeRetiros.vue'),
    meta: { permiso: 'cuentas-por-pagar.retiros.ver', titulo: ventana.titulo },
  },
  {
    path: '/cuentas-por-pagar/retiros/:id',
    name: 'cuentas-por-pagar.retiros.ficha',
    component: () => import('./paginas/FichaDeRetiro.vue'),
    props: ({ params }) => ({ id: String(params.id) }),
    meta: { permiso: 'cuentas-por-pagar.retiros.ver', titulo: ventana.ficha },
  },
  {
    path: '/cuentas-por-pagar/retiros/:id/pagar',
    name: 'cuentas-por-pagar.retiros.pagar',
    component: () => import('./paginas/PagoEnEfectivo.vue'),
    props: ({ params }) => ({ id: String(params.id) }),
    meta: { permiso: PERMISO_DE_PAGAR, titulo: ventana.pagar },
  },
  {
    path: '/cuentas-por-pagar/pagos/efectivo',
    name: 'cuentas-por-pagar.pagos.efectivo',
    component: () => import('./paginas/EleccionDeRetiroParaPagar.vue'),
    meta: { permiso: PERMISO_DE_PAGAR, titulo: ventana.elegir },
  },
  {
    path: '/cuentas-por-pagar/pagos/recibos',
    name: 'cuentas-por-pagar.pagos.recibos',
    component: () => import('./paginas/RecibosDeEfectivo.vue'),
    meta: { permiso: 'cuentas-por-pagar.pagos.ver', titulo: ventana.recibos },
  },
];

export const entradasDeRetiros: EntradaMenu[] = [
  {
    titulo: ventana.titulo,
    ruta: '/cuentas-por-pagar/retiros',
    icono: Wallet,
    seccion: 'operacion',
    permiso: 'cuentas-por-pagar.retiros.ver',
  },
];
