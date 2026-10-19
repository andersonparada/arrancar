import { ReceiptText } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_LIBRO_DE_COMPRAS, TITULO_SECCION_FISCAL } from './textos';
import { Tags } from 'lucide-vue-next';
import { VENTANAS_LIBRO_DE_COMPRAS } from './textos';
import { FileText, Fuel } from 'lucide-vue-next';
import { VENTANA_DE_DOCUMENTOS } from './textos-de-documentos';
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
      path: '/libro-de-compras/documentos/:documentoId',
      name: 'libro-de-compras.documentos.ficha',
      component: () => import('./paginas/FichaDeDocumento.vue'),
      props: ({ params }) => ({ documentoId: String(params.documentoId) }),
      meta: { permiso: 'libro-de-compras.documentos.ver', titulo: VENTANA_DE_DOCUMENTOS.ficha },
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
        // generador: menu
      ],
    },
  ],
};
