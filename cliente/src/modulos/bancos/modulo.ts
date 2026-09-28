import { ArrowLeftRight, Building2, Landmark, WalletCards } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_BANCOS, VENTANAS_BANCOS } from './textos';
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
    {
      path: '/bancos/movimientos',
      name: 'bancos.movimientos',
      component: () => import('./paginas/ListaDeMovimientos.vue'),
      meta: { permiso: 'bancos.movimientos.ver', titulo: VENTANAS_BANCOS.movimientos.titulo },
    },
    {
      path: '/bancos/chequeras/:chequeraId',
      name: 'bancos.chequeras.ficha',
      component: () => import('./paginas/FichaDeChequera.vue'),
      props: true,
      meta: { permiso: 'bancos.cuentas-bancarias.ver', titulo: 'Cheques de la chequera' },
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
          icono: Building2,
          seccion: 'administracion',
          permiso: 'bancos.bancos.ver',
        },
        {
          titulo: VENTANAS_BANCOS.cuentasBancarias.titulo,
          ruta: '/bancos/cuentas-bancarias',
          icono: WalletCards,
          seccion: 'administracion',
          permiso: 'bancos.cuentas-bancarias.ver',
        },
        {
          titulo: VENTANAS_BANCOS.movimientos.titulo,
          ruta: '/bancos/movimientos',
          icono: ArrowLeftRight,
          seccion: 'operacion',
          permiso: 'bancos.movimientos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
