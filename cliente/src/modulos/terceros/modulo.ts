import { Users } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';

export const moduloTerceros: DefinicionModuloCliente = {
  clave: 'terceros',
  rutas: [
    {
      path: '/terceros',
      name: 'terceros',
      component: () => import('./paginas/ListaTerceros.vue'),
      meta: { permiso: 'terceros.ver', titulo: 'Clientes y proveedores' },
    },
    {
      path: '/terceros/:terceroId',
      name: 'terceros.ficha',
      component: () => import('./paginas/FichaTercero.vue'),
      meta: { permiso: 'terceros.ver', titulo: 'Ficha' },
    },
  ],
  menu: [
    { titulo: 'Clientes y proveedores', ruta: '/terceros', icono: Users, permiso: 'terceros.ver', grupo: 'Clientes' },
  ],
};
