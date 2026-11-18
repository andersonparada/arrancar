import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  Hourglass,
  PiggyBank,
  ReceiptText,
  ScrollText,
} from 'lucide-vue-next';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_CUENTAS_POR_PAGAR } from './textos';

const PERMISO_DE_SALDOS = 'cuentas-por-pagar.reportes-de-saldos.ver';
const PERMISO_DE_PAGOS = 'cuentas-por-pagar.reportes-de-pagos.ver';
const PERMISO_DE_CONTROL = 'cuentas-por-pagar.reportes-de-control.ver';

interface Reporte {
  ruta: string;
  titulo: string;
  icono: Component;
  pagina: () => Promise<{ default: Component }>;
  /** Por omisión, el de los reportes de saldos. */
  permiso?: string;
}

/** Los reportes de saldos, pagos y control: una sola lista da su ruta, su permiso y su entrada del menú. */
const REPORTES: Reporte[] = [
  {
    ruta: 'saldos-por-proveedor',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosPorProveedor.titulo,
    icono: Hourglass,
    pagina: () => import('./paginas/SaldosPorProveedor.vue'),
  },
  {
    ruta: 'documentos',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.documentosAUnaFecha.titulo,
    icono: ReceiptText,
    pagina: () => import('./paginas/DocumentosAUnaFecha.vue'),
  },
  {
    ruta: 'estado-de-cuenta',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.estadoDeCuenta.titulo,
    icono: ScrollText,
    pagina: () => import('./paginas/EstadoDeCuentaDelProveedor.vue'),
  },
  {
    ruta: 'saldos-a-favor',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosAFavor.titulo,
    icono: PiggyBank,
    pagina: () => import('./paginas/SaldosAFavor.vue'),
  },
  {
    ruta: 'contrasenas-por-pagar',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenasPorPagar.titulo,
    icono: CalendarClock,
    pagina: () => import('./paginas/ContrasenasPorPagar.vue'),
  },
  {
    ruta: 'pagos',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.pagosRealizados.titulo,
    icono: Banknote,
    pagina: () => import('./paginas/PagosRealizados.vue'),
    permiso: PERMISO_DE_PAGOS,
  },
  {
    ruta: 'cheques-posfechados',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.chequesPosfechados.titulo,
    icono: CalendarClock,
    pagina: () => import('./paginas/ChequesPosfechados.vue'),
    permiso: PERMISO_DE_PAGOS,
  },
  {
    ruta: 'ajustes-del-mes',
    titulo: VENTANAS_CUENTAS_POR_PAGAR.ajustesDelMes.titulo,
    icono: ClipboardCheck,
    pagina: () => import('./paginas/AjustesDelMes.vue'),
    permiso: PERMISO_DE_CONTROL,
  },
];

export const rutasDeReportes: RouteRecordRaw[] = REPORTES.map(({ ruta, titulo, pagina, permiso }) => ({
  path: `/cuentas-por-pagar/reportes/${ruta}`,
  name: `cuentas-por-pagar.reportes.${ruta}`,
  component: pagina,
  meta: { permiso: permiso ?? PERMISO_DE_SALDOS, titulo },
}));

export const entradasDeReportes: EntradaMenu[] = REPORTES.map(({ ruta, titulo, icono, permiso }) => ({
  titulo,
  ruta: `/cuentas-por-pagar/reportes/${ruta}`,
  icono,
  seccion: 'reportes',
  permiso: permiso ?? PERMISO_DE_SALDOS,
}));
