import { HandCoins, Inbox } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_CUENTAS_POR_PAGAR, TITULO_SECCION_DE_PAGO, VENTANAS_CUENTAS_POR_PAGAR } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Cuentas por pagar. Un grupo sin opciones no se muestra. */
export const moduloCuentasPorPagar: DefinicionModuloCliente = {
  clave: 'cuentas-por-pagar',
  rutas: [
    {
      path: '/cuentas-por-pagar/bandeja',
      name: 'cuentas-por-pagar.bandeja',
      component: () => import('./paginas/BandejaDeCuentasPorPagar.vue'),
      meta: { permiso: 'cuentas-por-pagar.documentos.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.bandeja.titulo },
    },
    // generador: rutas
  ],
  // Los días de crédito se editan dentro de Proveedores y se guardan con su formulario.
  secciones: [
    {
      en: 'proveedor',
      titulo: TITULO_SECCION_DE_PAGO,
      orden: 20,
      formulario: () => import('./componentes/SeccionCondicionesDePago.vue'),
      ficha: () => import('./componentes/FichaCondicionesDePago.vue'),
    },
  ],
  menu: [
    {
      clave: 'cuentas-por-pagar',
      titulo: NOMBRE_CUENTAS_POR_PAGAR,
      icono: HandCoins,
      entradas: [
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.bandeja.titulo,
          ruta: '/cuentas-por-pagar/bandeja',
          icono: Inbox,
          seccion: 'operacion',
          permiso: 'cuentas-por-pagar.documentos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
