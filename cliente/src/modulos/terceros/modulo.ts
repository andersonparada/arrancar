import { Users } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';

export const moduloTerceros: DefinicionModuloCliente = {
  clave: 'terceros',
  rutas: [
    {
      path: '/terceros',
      name: 'terceros',
      component: () => import('./paginas/ListaTerceros.vue'),
      meta: { permiso: 'terceros.ver', titulo: 'Terceros' },
    },
    {
      path: '/terceros/:terceroId',
      name: 'terceros.ficha',
      component: () => import('./paginas/FichaTercero.vue'),
      meta: { permiso: 'terceros.ver', titulo: 'Ficha del tercero' },
    },
  ],
  menu: [{ titulo: 'Terceros', ruta: '/terceros', icono: Users, permiso: 'terceros.ver', grupo: 'Terceros' }],
};
