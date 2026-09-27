import { Contact, Users } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_TERCEROS, VENTANAS_TERCEROS } from './textos';

export const moduloTerceros: DefinicionModuloCliente = {
  clave: 'terceros',
  rutas: [
    {
      path: '/terceros',
      name: 'terceros',
      component: () => import('./paginas/ListaTerceros.vue'),
      meta: { permiso: 'terceros.ver', titulo: VENTANAS_TERCEROS.clientesYProveedores.titulo },
    },
    {
      path: '/terceros/:terceroId',
      name: 'terceros.ficha',
      component: () => import('./paginas/FichaTercero.vue'),
      meta: { permiso: 'terceros.ver', titulo: VENTANAS_TERCEROS.ficha.titulo },
    },
  ],
  menu: [
    {
      clave: 'clientes',
      titulo: NOMBRE_TERCEROS,
      icono: Contact,
      entradas: [
        {
          titulo: VENTANAS_TERCEROS.clientesYProveedores.titulo,
          ruta: '/terceros',
          icono: Users,
          seccion: 'administracion',
          permiso: 'terceros.ver',
        },
      ],
    },
  ],
};
