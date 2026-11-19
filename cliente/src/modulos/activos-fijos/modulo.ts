import { Landmark } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_ACTIVOS_FIJOS } from './textos';
import { Shapes } from 'lucide-vue-next';
import { VENTANAS_ACTIVOS_FIJOS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Activos fijos. Un grupo sin opciones no se muestra. */
export const moduloActivosFijos: DefinicionModuloCliente = {
  clave: 'activos-fijos',
  rutas: [
    {
      path: '/activos-fijos/clases',
      name: 'activos-fijos.clases',
      component: () => import('./paginas/ListaDeClases.vue'),
      meta: { permiso: 'activos-fijos.clases.ver', titulo: VENTANAS_ACTIVOS_FIJOS.clases.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'activos-fijos',
      titulo: NOMBRE_ACTIVOS_FIJOS,
      icono: Landmark,
      entradas: [
        {
          titulo: VENTANAS_ACTIVOS_FIJOS.clases.titulo,
          ruta: '/activos-fijos/clases',
          icono: Shapes,
          seccion: 'administracion',
          permiso: 'activos-fijos.clases.ver',
        },
        // generador: menu
      ],
    },
  ],
};
