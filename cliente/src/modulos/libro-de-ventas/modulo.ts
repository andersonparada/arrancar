import { ReceiptText } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_LIBRO_DE_VENTAS } from './textos';
import { Tags } from 'lucide-vue-next';
import { VENTANAS_LIBRO_DE_VENTAS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Libro de ventas. Un grupo sin opciones no se muestra. */
export const moduloLibroDeVentas: DefinicionModuloCliente = {
  clave: 'libro-de-ventas',
  rutas: [
    {
      path: '/libro-de-ventas/conceptos-de-ingreso',
      name: 'libro-de-ventas.conceptos-de-ingreso',
      component: () => import('./paginas/ListaDeConceptosDeIngreso.vue'),
      meta: {
        permiso: 'libro-de-ventas.conceptos-de-ingreso.ver',
        titulo: VENTANAS_LIBRO_DE_VENTAS.conceptosDeIngreso.titulo,
      },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'libro-de-ventas',
      titulo: NOMBRE_LIBRO_DE_VENTAS,
      icono: ReceiptText,
      entradas: [
        {
          titulo: VENTANAS_LIBRO_DE_VENTAS.conceptosDeIngreso.titulo,
          ruta: '/libro-de-ventas/conceptos-de-ingreso',
          icono: Tags,
          seccion: 'administracion',
          permiso: 'libro-de-ventas.conceptos-de-ingreso.ver',
        },
        // generador: menu
      ],
    },
  ],
};
