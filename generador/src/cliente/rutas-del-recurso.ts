import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';

interface Ruta {
  /** Lo que se agrega a la ruta de la lista: `/nuevo`, `/:animalId`. */
  sufijo: string;
  /** Lo que se agrega al nombre de la lista: `.nuevo`, `.ficha`. */
  nombre: string;
  pagina: string;
  permiso: 'permisoVer' | 'permisoCrear' | 'permisoEditar';
  /** La clave de la ventana en `textos.ts` que da el título. */
  titulo: 'titulo' | 'nuevo' | 'editar';
}

const CATALOGO: Ruta[] = [
  { sufijo: '', nombre: '', pagina: 'ListaDe{{Plural}}', permiso: 'permisoVer', titulo: 'titulo' },
];

/** Lista, alta, ficha y edición; la ficha y la edición reciben el id como propiedad. */
const COMPLETA: Ruta[] = [
  ...CATALOGO,
  {
    sufijo: '/nuevo',
    nombre: '.nuevo',
    pagina: 'FormularioDe{{Entidad}}',
    permiso: 'permisoCrear',
    titulo: 'nuevo',
  },
  {
    sufijo: '/:{{entidad}}Id',
    nombre: '.ficha',
    pagina: 'FichaDe{{Entidad}}',
    permiso: 'permisoVer',
    titulo: 'titulo',
  },
  {
    sufijo: '/:{{entidad}}Id/editar',
    nombre: '.editar',
    pagina: 'FormularioDe{{Entidad}}',
    permiso: 'permisoEditar',
    titulo: 'editar',
  },
];

function lineasDeRuta(ruta: Ruta, valores: Record<string, string>): string[] {
  const { moduloClave, pluralClave, rutaNombre, MODULO, plural } = valores;
  const conId = ruta.sufijo.includes(':');
  return [
    '{',
    `  path: '/${moduloClave}/${pluralClave}${ruta.sufijo}',`,
    `  name: '${rutaNombre}${ruta.nombre}',`,
    `  component: () => import('./paginas/${ruta.pagina}.vue'),`,
    ...(conId ? ['  props: true,'] : []),
    `  meta: { permiso: '${valores[ruta.permiso]}', titulo: VENTANAS_${MODULO}.${plural}.${ruta.titulo} },`,
    '},',
  ];
}

/** Las rutas del recurso en el `modulo.ts` del cliente, con los huecos de la página aún sin rellenar. */
export const rutasDelRecurso = (definicion: DefinicionDeRecurso, valores: Record<string, string>): string[] =>
  (definicion.pantalla === 'completa' ? COMPLETA : CATALOGO).flatMap((ruta) => lineasDeRuta(ruta, valores));
