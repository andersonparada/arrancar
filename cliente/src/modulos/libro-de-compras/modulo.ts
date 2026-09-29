import { ReceiptText } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_LIBRO_DE_COMPRAS, TITULO_SECCION_FISCAL } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Libro de compras. Un grupo sin opciones no se muestra. */
export const moduloLibroDeCompras: DefinicionModuloCliente = {
  clave: 'libro-de-compras',
  rutas: [
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
        // generador: menu
      ],
    },
  ],
};
