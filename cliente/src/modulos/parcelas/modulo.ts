import { LandPlot } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_PARCELAS } from './textos';
import { Shapes } from 'lucide-vue-next';
import { VENTANAS_PARCELAS } from './textos';
// generador: importaciones

/** Rutas y menú del módulo Parcelas. Un grupo sin opciones no se muestra. */
export const moduloParcelas: DefinicionModuloCliente = {
  clave: 'parcelas',
  rutas: [
    {
      path: '/parcelas/tipos-de-parcela',
      name: 'parcelas.tipos-de-parcela',
      component: () => import('./paginas/ListaDeTiposDeParcela.vue'),
      meta: { permiso: 'parcelas.tipos-de-parcela.ver', titulo: VENTANAS_PARCELAS.tiposDeParcela.titulo },
    },
    // generador: rutas
  ],
  menu: [
    {
      clave: 'parcelas',
      titulo: NOMBRE_PARCELAS,
      icono: LandPlot,
      entradas: [
        {
          titulo: VENTANAS_PARCELAS.tiposDeParcela.titulo,
          ruta: '/parcelas/tipos-de-parcela',
          icono: Shapes,
          seccion: 'administracion',
          permiso: 'parcelas.tipos-de-parcela.ver',
        },
        // generador: menu
      ],
    },
  ],
};
