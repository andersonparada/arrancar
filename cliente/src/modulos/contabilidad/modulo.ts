import { BookOpenCheck, Flag, Link2, ListTree } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CONTABILIDAD, VENTANAS_CONTABILIDAD } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Contabilidad. Un grupo sin opciones no se muestra. */
export const moduloContabilidad: DefinicionModuloCliente = {
  clave: 'contabilidad',
  rutas: [
    {
      path: '/contabilidad/inicio',
      name: 'contabilidad.inicio',
      component: () => import('./paginas/InicioDeContabilidad.vue'),
      meta: { permiso: 'contabilidad.inicio.ver', titulo: VENTANAS_CONTABILIDAD.inicio.titulo },
    },
    {
      path: '/contabilidad/nomenclatura',
      name: 'contabilidad.nomenclatura',
      component: () => import('./paginas/NomenclaturaContable.vue'),
      meta: { permiso: 'contabilidad.cuentas.ver', titulo: VENTANAS_CONTABILIDAD.nomenclatura.titulo },
    },
    {
      path: '/contabilidad/enlaces',
      name: 'contabilidad.enlaces',
      component: () => import('./paginas/EnlacesContables.vue'),
      meta: { permiso: 'contabilidad.enlaces.ver', titulo: VENTANAS_CONTABILIDAD.enlaces.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'contabilidad',
      titulo: NOMBRE_CONTABILIDAD,
      icono: BookOpenCheck,
      entradas: [
        {
          titulo: VENTANAS_CONTABILIDAD.inicio.titulo,
          ruta: '/contabilidad/inicio',
          icono: Flag,
          seccion: 'administracion',
          permiso: 'contabilidad.inicio.ver',
        },
        {
          titulo: VENTANAS_CONTABILIDAD.nomenclatura.titulo,
          ruta: '/contabilidad/nomenclatura',
          icono: ListTree,
          seccion: 'administracion',
          permiso: 'contabilidad.cuentas.ver',
        },
        {
          titulo: VENTANAS_CONTABILIDAD.enlaces.titulo,
          ruta: '/contabilidad/enlaces',
          icono: Link2,
          seccion: 'administracion',
          permiso: 'contabilidad.enlaces.ver',
        },
        // generador: menu
      ],
    },
  ],
};
