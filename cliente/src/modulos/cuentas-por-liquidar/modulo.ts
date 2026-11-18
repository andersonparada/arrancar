import { HandCoins } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CUENTAS_POR_LIQUIDAR } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Cuentas por liquidar. Un grupo sin opciones no se muestra. */
export const moduloCuentasPorLiquidar: DefinicionModuloCliente = {
  clave: 'cuentas-por-liquidar',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'cuentas-por-liquidar',
      titulo: NOMBRE_CUENTAS_POR_LIQUIDAR,
      icono: HandCoins,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
