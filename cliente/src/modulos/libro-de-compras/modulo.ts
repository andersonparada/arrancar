import { ReceiptText } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_LIBRO_DE_COMPRAS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Libro de compras. Un grupo sin opciones no se muestra. */
export const moduloLibroDeCompras: DefinicionModuloCliente = {
  clave: 'libro-de-compras',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'libro-de-compras',
      titulo: NOMBRE_LIBRO_DE_COMPRAS,
      icono: ReceiptText,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
