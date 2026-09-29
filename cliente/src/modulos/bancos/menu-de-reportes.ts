import { Hourglass, ListOrdered, ScrollText } from 'lucide-vue-next';
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
];
