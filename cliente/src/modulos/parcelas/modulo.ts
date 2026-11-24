import { LandPlot, MapPinned, Shapes } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_PARCELAS } from './textos';
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
    {
      path: '/parcelas/parcelas',
      name: 'parcelas.parcelas',
      component: () => import('./paginas/ListaDeParcelas.vue'),
      meta: { permiso: 'parcelas.parcelas.ver', titulo: VENTANAS_PARCELAS.parcelas.titulo },
    },
    {
      path: '/parcelas/parcelas/nueva',
      name: 'parcelas.parcelas.nueva',
      component: () => import('./paginas/FormularioDeParcela.vue'),
      meta: { permiso: 'parcelas.parcelas.crear', titulo: VENTANAS_PARCELAS.parcelas.nuevo },
    },
    {
      path: '/parcelas/parcelas/:parcelaId',
      name: 'parcelas.parcelas.ficha',
      component: () => import('./paginas/FichaDeParcela.vue'),
      props: true,
      meta: { permiso: 'parcelas.parcelas.ver', titulo: VENTANAS_PARCELAS.parcelas.titulo },
    },
    {
      path: '/parcelas/parcelas/:parcelaId/editar',
      name: 'parcelas.parcelas.editar',
      component: () => import('./paginas/FormularioDeParcela.vue'),
      props: true,
      meta: { permiso: 'parcelas.parcelas.editar', titulo: VENTANAS_PARCELAS.parcelas.editar },
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
          titulo: VENTANAS_PARCELAS.parcelas.titulo,
          ruta: '/parcelas/parcelas',
          icono: MapPinned,
          seccion: 'administracion',
          permiso: 'parcelas.parcelas.ver',
        },
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
