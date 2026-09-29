import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { CategoriasControlador, ContactosControlador } from './contactos-y-categorias.controlador.js';
import type { TercerosControlador } from './terceros.controlador.js';
import {
  esquemaAltaDeTercero,
  esquemaBusquedaDeContactos,
  esquemaCategoria,
  esquemaContacto,
  esquemaFiltrosDeTerceros,
  esquemaPapelDeCliente,
  esquemaPapelDeProveedor,
  esquemaParamsCategoria,
  esquemaParamsContacto,
  esquemaParamsTercero,
  esquemaTercero,
  type AltaDeTerceroSolicitada,
} from './terceros.esquemas-http.js';

export interface ControladoresDeTerceros {
  terceros: TercerosControlador;
  contactos: ContactosControlador;
  categorias: CategoriasControlador;
}

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Clientes y proveedores'];
const conTercero = { tags: etiquetas, params: esquemaParamsTercero };
const conContacto = { tags: etiquetas, params: esquemaParamsContacto };

/** Registrar a alguien ya como cliente o proveedor exige, además, el permiso de ese papel. */
async function exigirPermisoDelPapel(solicitud: FastifyRequest<{ Body: AltaDeTerceroSolicitada }>): Promise<void> {
  const { papel } = solicitud.body;
  if (papel && !contextoDe(solicitud).permisos.has(PERMISO_DEL_PAPEL[papel.tipo])) throw new AccesoDenegado();
}

const PERMISO_DEL_PAPEL = { cliente: 'clientes.crear', proveedor: 'proveedores.crear' } as const;

function rutasDeDatosGenerales(app: Aplicacion, terceros: TercerosControlador): void {
  const ver = proteger({ permiso: 'terceros.ver' });
  const crear = proteger({ permiso: 'terceros.crear' });
  const editar = proteger({ permiso: 'terceros.editar' });
  app.get('/terceros', {
    schema: { tags: etiquetas, querystring: esquemaFiltrosDeTerceros },
    preHandler: ver,
    handler: terceros.listar,
  });
  app.get('/terceros/:terceroId', { schema: conTercero, preHandler: ver, handler: terceros.obtenerFicha });
  app.post('/terceros', {
    schema: { tags: etiquetas, body: esquemaAltaDeTercero },
    preHandler: [crear, exigirPermisoDelPapel],
    handler: terceros.registrar,
  });
  app.put('/terceros/:terceroId', {
    schema: { ...conTercero, body: esquemaTercero },
    preHandler: editar,
    handler: terceros.actualizar,
  });
}

function rutasDelPapelDeCliente(app: Aplicacion, terceros: TercerosControlador): void {
  const url = '/terceros/:terceroId/cliente';
  app.put(url, {
    schema: { ...conTercero, body: esquemaPapelDeCliente },
    preHandler: proteger({ permiso: 'clientes.editar' }),
    handler: terceros.asignarCliente,
  });
  app.delete(url, {
    schema: conTercero,
    preHandler: proteger({ permiso: 'clientes.eliminar' }),
    handler: terceros.quitarCliente,
  });
}

function rutasDelPapelDeProveedor(app: Aplicacion, terceros: TercerosControlador): void {
  const url = '/terceros/:terceroId/proveedor';
  app.put(url, {
    schema: { ...conTercero, body: esquemaPapelDeProveedor },
    preHandler: proteger({ permiso: 'proveedores.editar' }),
    handler: terceros.asignarProveedor,
  });
  app.delete(url, {
    schema: conTercero,
    preHandler: proteger({ permiso: 'proveedores.eliminar' }),
    handler: terceros.quitarProveedor,
  });
}

function rutasDeContactos(app: Aplicacion, contactos: ContactosControlador): void {
  const crear = proteger({ permiso: 'terceros.crear' });
  const editar = proteger({ permiso: 'terceros.editar' });
  const eliminar = proteger({ permiso: 'terceros.eliminar' });
  const url = '/terceros/:terceroId/contactos';
  app.get(url, { schema: conTercero, preHandler: proteger({ permiso: 'terceros.ver' }), handler: contactos.listar });
  app.post(url, {
    schema: { ...conTercero, body: esquemaContacto },
    preHandler: crear,
    handler: contactos.agregar,
  });
  app.put(`${url}/:contactoId`, {
    schema: { ...conContacto, body: esquemaContacto },
    preHandler: editar,
    handler: contactos.cambiar,
  });
  app.delete(`${url}/:contactoId`, { schema: conContacto, preHandler: eliminar, handler: contactos.eliminar });
  app.get('/contactos', {
    schema: { tags: etiquetas, querystring: esquemaBusquedaDeContactos },
    preHandler: proteger({ permiso: 'terceros.ver' }),
    handler: contactos.buscar,
  });
}

function rutasDeCategorias(app: Aplicacion, categorias: CategoriasControlador): void {
  const crear = proteger({ permiso: 'proveedores.crear' });
  const editar = proteger({ permiso: 'proveedores.editar' });
  const url = '/proveedores/categorias';
  app.get(url, {
    schema: { tags: etiquetas },
    preHandler: proteger({ permiso: 'terceros.ver' }),
    handler: categorias.listar,
  });
  app.post(url, {
    schema: { tags: etiquetas, body: esquemaCategoria },
    preHandler: crear,
    handler: categorias.crear,
  });
  app.put(`${url}/:categoriaId`, {
    schema: { tags: etiquetas, params: esquemaParamsCategoria, body: esquemaCategoria },
    preHandler: editar,
    handler: categorias.cambiar,
  });
}

export function rutasTerceros(controladores: ControladoresDeTerceros): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeDatosGenerales(app, controladores.terceros);
    rutasDelPapelDeCliente(app, controladores.terceros);
    rutasDelPapelDeProveedor(app, controladores.terceros);
    rutasDeContactos(app, controladores.contactos);
    rutasDeCategorias(app, controladores.categorias);
  };
}
