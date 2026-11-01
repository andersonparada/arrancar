import { ListChecks } from 'lucide-vue-next';
import { VENTANA_DEL_SAT_2046 } from './textos-del-sat-2046';

/** La guía del SAT-2046 del pequeño contribuyente: su ruta y su opción en el menú de Reportes. */
export const RUTA_DEL_SAT_2046 = {
  path: '/libro-de-compras/libro/sat-2046',
  name: 'libro-de-compras.libro.sat-2046',
  component: () => import('./paginas/DatosParaElSat2046.vue'),
  meta: { permiso: 'libro-de-compras.libro.ver', titulo: VENTANA_DEL_SAT_2046.titulo },
};

export const OPCION_DE_MENU_DEL_SAT_2046 = {
  titulo: VENTANA_DEL_SAT_2046.titulo,
  ruta: '/libro-de-compras/libro/sat-2046',
  icono: ListChecks,
  seccion: 'reportes' as const,
  permiso: 'libro-de-compras.libro.ver',
};
