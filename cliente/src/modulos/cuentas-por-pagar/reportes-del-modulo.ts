import { CalendarClock, Hourglass, PiggyBank, ReceiptText, ScrollText } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_CUENTAS_POR_PAGAR } from './textos';

const PERMISO = 'cuentas-por-pagar.reportes-de-saldos.ver';

interface Reporte {
  ruta: string;
  titulo: string;
  icono: Component;
  pagina: () => Promise<{ default: Component }>;
}

/** Los reportes de saldos (R1 a R5): una sola lista da su ruta y su entrada del menú. */
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
];

export const rutasDeReportes: RouteRecordRaw[] = REPORTES.map(({ ruta, titulo, pagina }) => ({
  path: `/cuentas-por-pagar/reportes/${ruta}`,
  name: `cuentas-por-pagar.reportes.${ruta}`,
  component: pagina,
  meta: { permiso: PERMISO, titulo },
}));

export const entradasDeReportes: EntradaMenu[] = REPORTES.map(({ ruta, titulo, icono }) => ({
  titulo,
  ruta: `/cuentas-por-pagar/reportes/${ruta}`,
  icono,
  seccion: 'reportes',
  permiso: PERMISO,
}));
