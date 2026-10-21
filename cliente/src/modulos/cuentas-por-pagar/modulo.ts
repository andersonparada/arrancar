import { HandCoins } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CUENTAS_POR_PAGAR } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Cuentas por pagar. Un grupo sin opciones no se muestra. */
export const moduloCuentasPorPagar: DefinicionModuloCliente = {
  clave: 'cuentas-por-pagar',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'cuentas-por-pagar',
      titulo: NOMBRE_CUENTAS_POR_PAGAR,
      icono: HandCoins,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
