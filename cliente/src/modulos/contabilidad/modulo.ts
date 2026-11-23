import { BookOpenCheck } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CONTABILIDAD } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Contabilidad. Un grupo sin opciones no se muestra. */
export const moduloContabilidad: DefinicionModuloCliente = {
  clave: 'contabilidad',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'contabilidad',
      titulo: NOMBRE_CONTABILIDAD,
      icono: BookOpenCheck,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
