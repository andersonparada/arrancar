import { Landmark } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_BANCOS } from './textos';
import { List } from 'lucide-vue-next';
import { VENTANAS_BANCOS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Bancos. Un grupo sin opciones no se muestra. */
export const moduloBancos: DefinicionModuloCliente = {
  clave: 'bancos',
  rutas: [
    {
      path: '/bancos/bancos',
      name: 'bancos.bancos',
      component: () => import('./paginas/ListaDeBancos.vue'),
      meta: { permiso: 'bancos.bancos.ver', titulo: VENTANAS_BANCOS.bancos.titulo },
    },
    {
      path: '/bancos/cuentas-bancarias',
      name: 'bancos.cuentas-bancarias',
      component: () => import('./paginas/ListaDeCuentasBancarias.vue'),
      meta: { permiso: 'bancos.cuentas-bancarias.ver', titulo: VENTANAS_BANCOS.cuentasBancarias.titulo },
    },
    {
      path: '/bancos/cuentas-bancarias/nuevo',
      name: 'bancos.cuentas-bancarias.nuevo',
      component: () => import('./paginas/FormularioDeCuentaBancaria.vue'),
      meta: { permiso: 'bancos.cuentas-bancarias.gestionar', titulo: VENTANAS_BANCOS.cuentasBancarias.nuevo },
    },
    {
      path: '/bancos/cuentas-bancarias/:cuentaBancariaId',
      name: 'bancos.cuentas-bancarias.ficha',
      component: () => import('./paginas/FichaDeCuentaBancaria.vue'),
      props: true,
      meta: { permiso: 'bancos.cuentas-bancarias.ver', titulo: VENTANAS_BANCOS.cuentasBancarias.titulo },
    },
    {
      path: '/bancos/cuentas-bancarias/:cuentaBancariaId/editar',
      name: 'bancos.cuentas-bancarias.editar',
      component: () => import('./paginas/FormularioDeCuentaBancaria.vue'),
      props: true,
      meta: { permiso: 'bancos.cuentas-bancarias.gestionar', titulo: VENTANAS_BANCOS.cuentasBancarias.editar },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'bancos',
      titulo: NOMBRE_BANCOS,
      icono: Landmark,
      entradas: [
        {
          titulo: VENTANAS_BANCOS.bancos.titulo,
          ruta: '/bancos/bancos',
          icono: List,
          seccion: 'administracion',
          permiso: 'bancos.bancos.ver',
        },
        {
          titulo: VENTANAS_BANCOS.cuentasBancarias.titulo,
          ruta: '/bancos/cuentas-bancarias',
          icono: List,
          seccion: 'administracion',
          permiso: 'bancos.cuentas-bancarias.ver',
        },
        // generador: menu
      ],
    },
  ],
};
