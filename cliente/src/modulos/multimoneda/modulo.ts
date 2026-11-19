import { Coins } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_MULTIMONEDA } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Multimoneda. Un grupo sin opciones no se muestra. */
export const moduloMultimoneda: DefinicionModuloCliente = {
  clave: 'multimoneda',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'multimoneda',
      titulo: NOMBRE_MULTIMONEDA,
      icono: Coins,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
