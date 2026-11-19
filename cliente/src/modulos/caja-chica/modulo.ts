import { Inbox, Landmark, Wallet } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CAJA_CHICA, VENTANAS_CAJA_CHICA } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Caja chica. Un grupo sin opciones no se muestra. */
export const moduloCajaChica: DefinicionModuloCliente = {
  clave: 'caja-chica',
  rutas: [
    {
      path: '/caja-chica/fondos',
      name: 'caja-chica.fondos',
      component: () => import('./paginas/ListaDeFondos.vue'),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.fondos.titulo },
    },
    {
      path: '/caja-chica/fondos/:id',
      name: 'caja-chica.fondos.ficha',
      component: () => import('./paginas/FichaDeFondo.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.fondos.ficha },
    },
    {
      path: '/caja-chica/bandeja',
      name: 'caja-chica.bandeja',
      component: () => import('./paginas/BandejaDeCajaChica.vue'),
      meta: { permiso: 'caja-chica.fondos.ver', titulo: VENTANAS_CAJA_CHICA.bandeja.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'caja-chica',
      titulo: NOMBRE_CAJA_CHICA,
      icono: Wallet,
      entradas: [
        {
          titulo: VENTANAS_CAJA_CHICA.fondos.titulo,
          ruta: '/caja-chica/fondos',
          icono: Landmark,
          seccion: 'operacion',
          permiso: 'caja-chica.fondos.ver',
        },
        {
          titulo: VENTANAS_CAJA_CHICA.bandeja.titulo,
          ruta: '/caja-chica/bandeja',
          icono: Inbox,
          seccion: 'operacion',
          permiso: 'caja-chica.fondos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
