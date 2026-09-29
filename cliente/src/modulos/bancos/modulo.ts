import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CheckCheck,
  FileText,
  Landmark,
  ListChecks,
  NotebookTabs,
  Tags,
  WalletCards,
} from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { ENTRADAS_DE_REPORTES } from './menu-de-reportes';
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
      path: '/bancos/notas',
      name: 'bancos.notas',
      component: () => import('./paginas/ListaDeNotas.vue'),
      meta: { permiso: 'bancos.notas.ver', titulo: VENTANAS_BANCOS.notas.titulo },
    },
    {
      path: '/bancos/transferencias',
      name: 'bancos.transferencias',
      component: () => import('./paginas/ListaDeTransferencias.vue'),
      meta: { permiso: 'bancos.transferencias.ver', titulo: VENTANAS_BANCOS.transferencias.titulo },
    },
    {
      path: '/bancos/movimientos',
      name: 'bancos.movimientos',
      component: () => import('./paginas/ReporteDeMovimientos.vue'),
      meta: { permiso: 'bancos.movimientos.ver', titulo: VENTANAS_BANCOS.movimientos.titulo },
    },
    {
      path: '/bancos/chequeras',
      name: 'bancos.chequeras',
      component: () => import('./paginas/ListaDeChequeras.vue'),
      meta: { permiso: 'bancos.chequeras.ver', titulo: VENTANAS_BANCOS.chequeras.titulo },
    },
    {
      path: '/bancos/chequeras/:chequeraId',
      name: 'bancos.chequeras.ficha',
      component: () => import('./paginas/FichaDeChequera.vue'),
      props: true,
      meta: { permiso: 'bancos.chequeras.ver', titulo: 'Cheques de la chequera' },
    },
    {
      path: '/bancos/cheques',
      name: 'bancos.cheques',
      component: () => import('./paginas/ListaDeCheques.vue'),
      meta: { permiso: 'bancos.cheques.ver', titulo: VENTANAS_BANCOS.cheques.titulo },
    },
    {
      path: '/bancos/conciliaciones',
      name: 'bancos.conciliaciones',
      component: () => import('./paginas/ListaDeConciliaciones.vue'),
      meta: { permiso: 'bancos.conciliaciones.ver', titulo: VENTANAS_BANCOS.conciliaciones.titulo },
    },
    {
      path: '/bancos/conciliaciones/:conciliacionId',
      name: 'bancos.conciliaciones.conciliar',
      component: () => import('./paginas/ConciliarCuenta.vue'),
      props: true,
      meta: { permiso: 'bancos.conciliaciones.ver', titulo: 'Conciliar' },
    },
    {
      path: '/bancos/correlativos',
      name: 'bancos.correlativos',
      component: () => import('./paginas/ReporteDeCorrelativos.vue'),
      meta: { permiso: 'bancos.movimientos.ver', titulo: VENTANAS_BANCOS.correlativos.titulo },
    },
    {
      path: '/bancos/cheques-caducos',
      name: 'bancos.cheques-caducos',
      component: () => import('./paginas/ReporteDeChequesCaducos.vue'),
      meta: { permiso: 'bancos.cheques-caducos.ver', titulo: VENTANAS_BANCOS.chequesCaducos.titulo },
    },
    {
      path: '/bancos/sin-clasificar',
      name: 'bancos.sin-clasificar',
      component: () => import('./paginas/BandejaDeSinClasificar.vue'),
      meta: { permiso: 'bancos.movimientos.ver', titulo: VENTANAS_BANCOS.sinClasificar.titulo },
    },
    {
      path: '/bancos/conceptos',
      name: 'bancos.conceptos',
      component: () => import('./paginas/ListaDeConceptos.vue'),
      meta: { permiso: 'bancos.conceptos.ver', titulo: VENTANAS_BANCOS.conceptos.titulo },
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
          titulo: VENTANAS_BANCOS.chequeras.titulo,
          ruta: '/bancos/chequeras',
          icono: NotebookTabs,
          seccion: 'administracion',
          permiso: 'bancos.chequeras.ver',
        },
        {
          titulo: VENTANAS_BANCOS.notas.titulo,
          ruta: '/bancos/notas',
          icono: FileText,
          seccion: 'operacion',
          permiso: 'bancos.notas.ver',
        },
        {
          titulo: VENTANAS_BANCOS.transferencias.titulo,
          ruta: '/bancos/transferencias',
          icono: ArrowLeftRight,
          seccion: 'operacion',
          permiso: 'bancos.transferencias.ver',
        },
        {
          titulo: VENTANAS_BANCOS.cheques.titulo,
          ruta: '/bancos/cheques',
          icono: Banknote,
          seccion: 'operacion',
          permiso: 'bancos.cheques.ver',
        },
        {
          titulo: VENTANAS_BANCOS.sinClasificar.titulo,
          ruta: '/bancos/sin-clasificar',
          icono: ListChecks,
          seccion: 'operacion',
          permiso: 'bancos.movimientos.ver',
        },
        {
          titulo: VENTANAS_BANCOS.conciliaciones.titulo,
          ruta: '/bancos/conciliaciones',
          icono: CheckCheck,
          seccion: 'operacion',
          permiso: 'bancos.conciliaciones.ver',
        },
        ...ENTRADAS_DE_REPORTES,
        {
          titulo: VENTANAS_BANCOS.conceptos.titulo,
          ruta: '/bancos/conceptos',
          icono: Tags,
          seccion: 'administracion',
          permiso: 'bancos.conceptos.ver',
        },
        // generador: menu
      ],
    },
  ],
};
