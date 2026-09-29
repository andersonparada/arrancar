import { Briefcase, Contact, Search, ShoppingCart, Tags } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { PERMISOS_DEL_PAPEL, RUTAS_DEL_PAPEL } from './papeles';
import type { PapelTercero } from './servicios/terceros.api';
import { NOMBRE_TERCEROS, VENTANA_DEL_PAPEL, VENTANAS_TERCEROS } from './textos';

const ListaDeTerceros = () => import('./paginas/ListaDeTerceros.vue');
const FormularioDeTercero = () => import('./paginas/FormularioDeTercero.vue');
const FichaDeTercero = () => import('./paginas/FichaDeTercero.vue');

function listaYAlta(papel: PapelTercero): RouteRecordRaw[] {
  const nombre = RUTAS_DEL_PAPEL[papel];
  const ventana = VENTANA_DEL_PAPEL[papel];
  return [
    {
      path: `/${nombre}`,
      name: nombre,
      component: ListaDeTerceros,
      props: { papel },
      meta: { permiso: 'terceros.ver', titulo: ventana.titulo },
    },
    {
      path: `/${nombre}/nuevo`,
      name: `${nombre}.nuevo`,
      component: FormularioDeTercero,
      props: { papel },
      meta: { permiso: PERMISOS_DEL_PAPEL[papel].crear, titulo: ventana.nuevo },
    },
  ];
}

function fichaYEdicion(papel: PapelTercero): RouteRecordRaw[] {
  const nombre = RUTAS_DEL_PAPEL[papel];
  const conId = (ruta: { params: Record<string, unknown> }) => ({ papel, terceroId: ruta.params.terceroId });
  return [
    {
      path: `/${nombre}/:terceroId`,
      name: `${nombre}.ficha`,
      component: FichaDeTercero,
      props: conId,
      meta: { permiso: 'terceros.ver', titulo: VENTANAS_TERCEROS.ficha.titulo },
    },
    {
      path: `/${nombre}/:terceroId/editar`,
      name: `${nombre}.editar`,
      component: FormularioDeTercero,
      props: conId,
      meta: { permiso: 'terceros.editar', titulo: VENTANA_DEL_PAPEL[papel].editar },
    },
  ];
}

/** Clientes y proveedores tienen las mismas cuatro pantallas; cambia el papel que reciben. */
const rutasDelPapel = (papel: PapelTercero) => [...listaYAlta(papel), ...fichaYEdicion(papel)];

export const moduloTerceros: DefinicionModuloCliente = {
  clave: 'terceros',
  rutas: [
    ...rutasDelPapel('cliente'),
    ...rutasDelPapel('proveedor'),
    {
      path: '/contactos',
      name: 'contactos',
      component: () => import('./paginas/BuscarContacto.vue'),
      meta: { permiso: 'terceros.ver', titulo: VENTANAS_TERCEROS.buscarContacto.titulo },
    },
    {
      path: '/categorias-de-proveedor',
      name: 'categorias-de-proveedor',
      component: () => import('./paginas/CategoriasDeProveedor.vue'),
      meta: { permiso: 'terceros.ver', titulo: VENTANAS_TERCEROS.categorias.titulo },
    },
    { path: '/terceros', redirect: { name: 'clientes' } },
    { path: '/terceros/:terceroId', redirect: (ruta) => ({ name: 'clientes.ficha', params: ruta.params }) },
  ],
  menu: [
    {
      clave: 'clientes',
      titulo: NOMBRE_TERCEROS,
      icono: Contact,
      entradas: [
        {
          titulo: VENTANAS_TERCEROS.buscarContacto.titulo,
          ruta: '/contactos',
          icono: Search,
          seccion: 'operacion',
          permiso: 'terceros.ver',
        },
        {
          titulo: VENTANAS_TERCEROS.clientes.titulo,
          ruta: '/clientes',
          icono: ShoppingCart,
          seccion: 'administracion',
          permiso: 'terceros.ver',
        },
        {
          titulo: VENTANAS_TERCEROS.proveedores.titulo,
          ruta: '/proveedores',
          icono: Briefcase,
          seccion: 'administracion',
          permiso: 'terceros.ver',
        },
        {
          titulo: VENTANAS_TERCEROS.categorias.titulo,
          ruta: '/categorias-de-proveedor',
          icono: Tags,
          seccion: 'administracion',
          permiso: 'terceros.ver',
        },
      ],
    },
  ],
};
