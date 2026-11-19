import { Landmark } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_ACTIVOS_FIJOS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Activos fijos. Un grupo sin opciones no se muestra. */
export const moduloActivosFijos: DefinicionModuloCliente = {
  clave: 'activos-fijos',
  rutas: [
    // generador: rutas
  ],
  menu: [
    {
      clave: 'activos-fijos',
      titulo: NOMBRE_ACTIVOS_FIJOS,
      icono: Landmark,
      entradas: [
        // generador: menu
      ],
    },
  ],
};
