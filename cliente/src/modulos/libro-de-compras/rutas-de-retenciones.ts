import { FileClock } from 'lucide-vue-next';
import { VENTANA_DE_CONSTANCIAS_PENDIENTES } from './textos-de-constancias-pendientes';
import { VENTANA_DE_ENTEROS, VENTANA_DE_RETENCIONES, VENTANA_POR_RESOLVER } from './textos-de-retenciones';

const PERMISO = 'libro-de-compras.retenciones.ver';

/** Las rutas de Retenciones: el mes, lo por resolver, los enteros y las constancias pendientes (R12). */
export const RUTAS_DE_RETENCIONES = [
  {
    path: '/libro-de-compras/retenciones',
    name: 'libro-de-compras.retenciones',
    component: () => import('./paginas/RetencionesDelMes.vue'),
    meta: { permiso: PERMISO, titulo: VENTANA_DE_RETENCIONES.titulo },
  },
  {
    path: '/libro-de-compras/retenciones/por-resolver',
    name: 'libro-de-compras.retenciones.por-resolver',
    component: () => import('./paginas/RetencionesPorResolver.vue'),
    meta: { permiso: PERMISO, titulo: VENTANA_POR_RESOLVER.titulo },
  },
  {
    path: '/libro-de-compras/retenciones/enteros',
    name: 'libro-de-compras.retenciones.enteros',
    component: () => import('./paginas/EnterosDeRetenciones.vue'),
    meta: { permiso: PERMISO, titulo: VENTANA_DE_ENTEROS.titulo },
  },
  {
    path: '/libro-de-compras/retenciones/constancias-pendientes',
    name: 'libro-de-compras.retenciones.constancias-pendientes',
    component: () => import('./paginas/ConstanciasPendientes.vue'),
    meta: { permiso: PERMISO, titulo: VENTANA_DE_CONSTANCIAS_PENDIENTES.titulo },
  },
];

export const OPCION_DE_MENU_DE_CONSTANCIAS_PENDIENTES = {
  titulo: VENTANA_DE_CONSTANCIAS_PENDIENTES.titulo,
  ruta: '/libro-de-compras/retenciones/constancias-pendientes',
  icono: FileClock,
  seccion: 'reportes' as const,
  permiso: PERMISO,
};
