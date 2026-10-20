import { ReceiptText } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_LIBRO_DE_COMPRAS, TITULO_SECCION_FISCAL } from './textos';
import { Tags } from 'lucide-vue-next';
import { VENTANAS_LIBRO_DE_COMPRAS } from './textos';
import { BookOpen, CalendarCheck, ChartColumn, FileText, Fuel, HandCoins, Landmark } from 'lucide-vue-next';
import { VENTANA_DEL_LIBRO } from './textos-del-libro';
import { VENTANA_DEL_SAT_2237 } from './textos-del-sat-2237';
import { VENTANA_DE_DOCUMENTOS } from './textos-de-documentos';
import { FORMULARIO_DE_DOCUMENTO } from './textos-del-registro';
import { VENTANA_DE_ENTEROS, VENTANA_DE_RETENCIONES, VENTANA_POR_RESOLVER } from './textos-de-retenciones';
import { VENTANA_DE_PERIODOS } from './textos-de-periodos';
import { VENTANA_DEL_ANALISIS } from './textos-del-analisis';
// generador: importaciones

/** Rutas y menú del módulo Libro de compras. Un grupo sin opciones no se muestra. */
export const moduloLibroDeCompras: DefinicionModuloCliente = {
  clave: 'libro-de-compras',
  rutas: [
    {
      path: '/libro-de-compras/conceptos-de-gasto',
      name: 'libro-de-compras.conceptos-de-gasto',
      component: () => import('./paginas/ListaDeConceptosDeGasto.vue'),
      meta: {
        permiso: 'libro-de-compras.conceptos-de-gasto.ver',
        titulo: VENTANAS_LIBRO_DE_COMPRAS.conceptosDeGasto.titulo,
      },
    },
    {
      path: '/libro-de-compras/combustibles',
      name: 'libro-de-compras.combustibles',
      component: () => import('./paginas/ListaDeCombustibles.vue'),
      meta: { permiso: 'libro-de-compras.combustibles.ver', titulo: VENTANAS_LIBRO_DE_COMPRAS.combustibles.titulo },
    },
    {
      path: '/libro-de-compras/documentos',
      name: 'libro-de-compras.documentos',
      component: () => import('./paginas/ListaDeDocumentos.vue'),
      meta: { permiso: 'libro-de-compras.documentos.ver', titulo: VENTANA_DE_DOCUMENTOS.titulo },
    },
    {
      path: '/libro-de-compras/documentos/nuevo',
      name: 'libro-de-compras.documentos.nuevo',
      component: () => import('./paginas/FormularioDeDocumento.vue'),
      meta: { permiso: 'libro-de-compras.documentos.crear', titulo: FORMULARIO_DE_DOCUMENTO.titulo },
    },
    {
      path: '/libro-de-compras/documentos/:documentoId',
      name: 'libro-de-compras.documentos.ficha',
      component: () => import('./paginas/FichaDeDocumento.vue'),
      props: ({ params }) => ({ documentoId: String(params.documentoId) }),
      meta: { permiso: 'libro-de-compras.documentos.ver', titulo: VENTANA_DE_DOCUMENTOS.ficha },
    },
    {
      path: '/libro-de-compras/libro',
      name: 'libro-de-compras.libro',
      component: () => import('./paginas/LibroDelPeriodo.vue'),
      meta: { permiso: 'libro-de-compras.libro.ver', titulo: VENTANA_DEL_LIBRO.titulo },
    },
    {
      path: '/libro-de-compras/libro/sat-2237',
      name: 'libro-de-compras.libro.sat-2237',
      component: () => import('./paginas/DatosParaElSat2237.vue'),
      meta: { permiso: 'libro-de-compras.libro.ver', titulo: VENTANA_DEL_SAT_2237.titulo },
    },
    {
      path: '/libro-de-compras/retenciones',
      name: 'libro-de-compras.retenciones',
      component: () => import('./paginas/RetencionesDelMes.vue'),
      meta: { permiso: 'libro-de-compras.retenciones.ver', titulo: VENTANA_DE_RETENCIONES.titulo },
    },
    {
      path: '/libro-de-compras/retenciones/por-resolver',
      name: 'libro-de-compras.retenciones.por-resolver',
      component: () => import('./paginas/RetencionesPorResolver.vue'),
      meta: { permiso: 'libro-de-compras.retenciones.ver', titulo: VENTANA_POR_RESOLVER.titulo },
    },
    {
      path: '/libro-de-compras/retenciones/enteros',
      name: 'libro-de-compras.retenciones.enteros',
      component: () => import('./paginas/EnterosDeRetenciones.vue'),
      meta: { permiso: 'libro-de-compras.retenciones.ver', titulo: VENTANA_DE_ENTEROS.titulo },
    },
    {
      path: '/libro-de-compras/periodos',
      name: 'libro-de-compras.periodos',
      component: () => import('./paginas/ListaDePeriodos.vue'),
      meta: { permiso: 'libro-de-compras.periodos.ver', titulo: VENTANA_DE_PERIODOS.titulo },
    },
    {
      path: '/libro-de-compras/periodos/:periodo(\\d{4}-\\d{2})',
      name: 'libro-de-compras.periodos.detalle',
      component: () => import('./paginas/DetalleDePeriodo.vue'),
      props: ({ params }) => ({ periodo: String(params.periodo) }),
      meta: { permiso: 'libro-de-compras.periodos.ver', titulo: VENTANA_DE_PERIODOS.detalle },
    },
    {
      path: '/libro-de-compras/analisis',
      name: 'libro-de-compras.analisis',
      component: () => import('./paginas/AnalisisDeCompras.vue'),
      meta: { permiso: 'libro-de-compras.analisis-de-compras.ver', titulo: VENTANA_DEL_ANALISIS.titulo },
    },
    // generador: rutas
  ],
  // Los datos fiscales se editan dentro de Empresas y Proveedores, y se guardan con esos formularios.
  secciones: [
    {
      en: 'empresa',
      titulo: TITULO_SECCION_FISCAL,
      orden: 10,
      formulario: () => import('./componentes/SeccionFiscalDeEmpresa.vue'),
      ficha: () => import('./componentes/FichaFiscalDeEmpresa.vue'),
    },
    {
      en: 'proveedor',
      titulo: TITULO_SECCION_FISCAL,
      orden: 10,
      formulario: () => import('./componentes/SeccionFiscalDeProveedor.vue'),
      ficha: () => import('./componentes/FichaFiscalDeProveedor.vue'),
    },
  ],
  menu: [
    {
      clave: 'libro-de-compras',
      titulo: NOMBRE_LIBRO_DE_COMPRAS,
      icono: ReceiptText,
      entradas: [
        {
          titulo: VENTANA_DE_DOCUMENTOS.titulo,
          ruta: '/libro-de-compras/documentos',
          icono: FileText,
          seccion: 'operacion',
          permiso: 'libro-de-compras.documentos.ver',
        },
        {
          titulo: VENTANA_DE_PERIODOS.titulo,
          ruta: '/libro-de-compras/periodos',
          icono: CalendarCheck,
          seccion: 'operacion',
          permiso: 'libro-de-compras.periodos.ver',
        },
        {
          titulo: VENTANAS_LIBRO_DE_COMPRAS.conceptosDeGasto.titulo,
          ruta: '/libro-de-compras/conceptos-de-gasto',
          icono: Tags,
          seccion: 'administracion',
          permiso: 'libro-de-compras.conceptos-de-gasto.ver',
        },
        {
          titulo: VENTANAS_LIBRO_DE_COMPRAS.combustibles.titulo,
          ruta: '/libro-de-compras/combustibles',
          icono: Fuel,
          seccion: 'administracion',
          permiso: 'libro-de-compras.combustibles.ver',
        },
        {
          titulo: VENTANA_DEL_LIBRO.titulo,
          ruta: '/libro-de-compras/libro',
          icono: BookOpen,
          seccion: 'reportes',
          permiso: 'libro-de-compras.libro.ver',
        },
        {
          titulo: VENTANA_DEL_SAT_2237.titulo,
          ruta: '/libro-de-compras/libro/sat-2237',
          icono: Landmark,
          seccion: 'reportes',
          permiso: 'libro-de-compras.libro.ver',
        },
        {
          titulo: VENTANA_DE_RETENCIONES.titulo,
          ruta: '/libro-de-compras/retenciones',
          icono: HandCoins,
          seccion: 'reportes',
          permiso: 'libro-de-compras.retenciones.ver',
        },
        {
          titulo: VENTANA_DEL_ANALISIS.titulo,
          ruta: '/libro-de-compras/analisis',
          icono: ChartColumn,
          seccion: 'reportes',
          permiso: 'libro-de-compras.analisis-de-compras.ver',
        },
        // generador: menu
      ],
    },
  ],
};
