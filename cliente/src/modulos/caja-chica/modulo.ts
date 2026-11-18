import { Wallet } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CAJA_CHICA } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Caja chica. Un grupo sin opciones no se muestra. */
export const moduloCajaChica: DefinicionModuloCliente = {
  clave: 'caja-chica',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'caja-chica',
      titulo: NOMBRE_CAJA_CHICA,
      icono: Wallet,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
