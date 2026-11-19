import { HandCoins, Hourglass, Scale } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CUENTAS_POR_LIQUIDAR, VENTANAS_CUENTAS_POR_LIQUIDAR } from './textos';
// generador: importaciones

const PERMISO_DE_REPORTES = 'cuentas-por-liquidar.reportes.ver';

/** Rutas y menú del módulo Cuentas por liquidar. Un grupo sin opciones no se muestra. */
export const moduloCuentasPorLiquidar: DefinicionModuloCliente = {
  clave: 'cuentas-por-liquidar',
  rutas: [
    {
      path: '/cuentas-por-liquidar/reportes/anticipos-por-liquidar',
      name: 'cuentas-por-liquidar.reportes.anticipos-por-liquidar',
      component: () => import('./paginas/AnticiposPorLiquidar.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.anticiposPorLiquidar.titulo },
    },
    {
      path: '/cuentas-por-liquidar/reportes/no-liquidado',
      name: 'cuentas-por-liquidar.reportes.no-liquidado',
      component: () => import('./paginas/NoLiquidado.vue'),
      meta: { permiso: PERMISO_DE_REPORTES, titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.noLiquidado.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'cuentas-por-liquidar',
      titulo: NOMBRE_CUENTAS_POR_LIQUIDAR,
      icono: HandCoins,
      entradas: [
        {
          titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.anticiposPorLiquidar.titulo,
          ruta: '/cuentas-por-liquidar/reportes/anticipos-por-liquidar',
          icono: Hourglass,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        {
          titulo: VENTANAS_CUENTAS_POR_LIQUIDAR.noLiquidado.titulo,
          ruta: '/cuentas-por-liquidar/reportes/no-liquidado',
          icono: Scale,
          seccion: 'reportes',
          permiso: PERMISO_DE_REPORTES,
        },
        // generador: menu
      ],
    },
  ],
};
