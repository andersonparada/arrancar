import { ClipboardCheck, FileClock, FileMinus, HandCoins, Hourglass, Inbox, ReceiptText, Scale } from 'lucide-vue-next';
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
    {
      path: '/cuentas-por-pagar/documentos',
      name: 'cuentas-por-pagar.documentos',
      component: () => import('./paginas/DocumentosPorPagar.vue'),
      meta: { permiso: 'cuentas-por-pagar.documentos.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.documentos.titulo },
    },
    {
      path: '/cuentas-por-pagar/documentos/:documentoId',
      name: 'cuentas-por-pagar.documentos.ficha',
      component: () => import('./paginas/FichaDelDocumentoPorPagar.vue'),
      props: ({ params }) => ({ documentoId: String(params.documentoId) }),
      meta: { permiso: 'cuentas-por-pagar.documentos.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.documentos.ficha },
    },
    {
      path: '/cuentas-por-pagar/notas-de-credito',
      name: 'cuentas-por-pagar.notas-de-credito',
      component: () => import('./paginas/NotasDeCredito.vue'),
      meta: { permiso: 'cuentas-por-pagar.documentos.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.notasDeCredito.titulo },
    },
    {
      path: '/cuentas-por-pagar/saldos-iniciales',
      name: 'cuentas-por-pagar.saldos-iniciales',
      component: () => import('./paginas/SaldosIniciales.vue'),
      meta: {
        permiso: 'cuentas-por-pagar.saldos-iniciales.ver',
        titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosIniciales.titulo,
      },
    },
    {
      path: '/cuentas-por-pagar/contrasenas',
      name: 'cuentas-por-pagar.contrasenas',
      component: () => import('./paginas/ListaDeContrasenas.vue'),
      meta: { permiso: 'cuentas-por-pagar.contrasenas.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.titulo },
    },
    {
      path: '/cuentas-por-pagar/contrasenas/nueva',
      name: 'cuentas-por-pagar.contrasenas.nueva',
      component: () => import('./paginas/NuevaContrasena.vue'),
      meta: { permiso: 'cuentas-por-pagar.contrasenas.crear', titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.nueva },
    },
    {
      path: '/cuentas-por-pagar/contrasenas/:id',
      name: 'cuentas-por-pagar.contrasenas.ficha',
      component: () => import('./paginas/FichaDeContrasena.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'cuentas-por-pagar.contrasenas.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.ficha },
    },
    {
      path: '/cuentas-por-pagar/contrasenas/:id/imprimir',
      name: 'cuentas-por-pagar.contrasenas.imprimir',
      component: () => import('./paginas/ImpresionDeContrasena.vue'),
      props: ({ params }) => ({ id: String(params.id) }),
      meta: { permiso: 'cuentas-por-pagar.contrasenas.ver', titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.imprimir },
    },
    {
      path: '/cuentas-por-pagar/reportes/saldos-por-proveedor',
      name: 'cuentas-por-pagar.reportes.saldos-por-proveedor',
      component: () => import('./paginas/SaldosPorProveedor.vue'),
      meta: {
        permiso: 'cuentas-por-pagar.reportes-de-saldos.ver',
        titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosPorProveedor.titulo,
      },
    },
    {
      path: '/cuentas-por-pagar/reportes/documentos',
      name: 'cuentas-por-pagar.reportes.documentos',
      component: () => import('./paginas/DocumentosAUnaFecha.vue'),
      meta: {
        permiso: 'cuentas-por-pagar.reportes-de-saldos.ver',
        titulo: VENTANAS_CUENTAS_POR_PAGAR.documentosAUnaFecha.titulo,
      },
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
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.documentos.titulo,
          ruta: '/cuentas-por-pagar/documentos',
          icono: FileClock,
          seccion: 'operacion',
          permiso: 'cuentas-por-pagar.documentos.ver',
        },
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.notasDeCredito.titulo,
          ruta: '/cuentas-por-pagar/notas-de-credito',
          icono: FileMinus,
          seccion: 'operacion',
          permiso: 'cuentas-por-pagar.documentos.ver',
        },
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.titulo,
          ruta: '/cuentas-por-pagar/contrasenas',
          icono: ClipboardCheck,
          seccion: 'operacion',
          permiso: 'cuentas-por-pagar.contrasenas.ver',
        },
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosIniciales.titulo,
          ruta: '/cuentas-por-pagar/saldos-iniciales',
          icono: Scale,
          seccion: 'administracion',
          permiso: 'cuentas-por-pagar.saldos-iniciales.ver',
        },
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.saldosPorProveedor.titulo,
          ruta: '/cuentas-por-pagar/reportes/saldos-por-proveedor',
          icono: Hourglass,
          seccion: 'reportes',
          permiso: 'cuentas-por-pagar.reportes-de-saldos.ver',
        },
        {
          titulo: VENTANAS_CUENTAS_POR_PAGAR.documentosAUnaFecha.titulo,
          ruta: '/cuentas-por-pagar/reportes/documentos',
          icono: ReceiptText,
          seccion: 'reportes',
          permiso: 'cuentas-por-pagar.reportes-de-saldos.ver',
        },
        // R12 vive en Libro de compras (CP5-f): aquí solo se enlaza, con el permiso de esa pantalla.
        {
          titulo: 'Constancias de retención pendientes',
          ruta: '/libro-de-compras/retenciones/constancias-pendientes',
          icono: FileClock,
          seccion: 'reportes',
          permiso: 'libro-de-compras.retenciones.ver',
        },
        // generador: menu
      ],
    },
  ],
};
