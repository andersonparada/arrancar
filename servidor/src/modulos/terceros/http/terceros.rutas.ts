import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/http/guardias.js';
import type { CategoriasControlador, ContactosControlador } from './contactos-y-categorias.controlador.js';
import type { TercerosControlador } from './terceros.controlador.js';
import {
  esquemaCategoria,
  esquemaContacto,
  esquemaFiltrosDeTerceros,
  esquemaPapelDeCliente,
  esquemaPapelDeProveedor,
  esquemaParamsCategoria,
  esquemaParamsContacto,
  esquemaParamsTercero,
  esquemaTercero,
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

function rutasDeDatosGenerales(app: Aplicacion, terceros: TercerosControlador): void {
  const ver = proteger({ permiso: 'terceros.ver' });
  const gestionar = proteger({ permiso: 'terceros.gestionar' });
  app.get('/terceros', {
    schema: { tags: etiquetas, querystring: esquemaFiltrosDeTerceros },
    preHandler: ver,
    handler: terceros.listar,
  });
  app.get('/terceros/:terceroId', { schema: conTercero, preHandler: ver, handler: terceros.obtenerFicha });
  app.post('/terceros', {
    schema: { tags: etiquetas, body: esquemaTercero },
    preHandler: gestionar,
    handler: terceros.registrar,
  });
  app.put('/terceros/:terceroId', {
    schema: { ...conTercero, body: esquemaTercero },
    preHandler: gestionar,
    handler: terceros.actualizar,
  });
}

function rutasDePapeles(app: Aplicacion, terceros: TercerosControlador): void {
  const clientes = proteger({ permiso: 'clientes.gestionar' });
  const proveedores = proteger({ permiso: 'proveedores.gestionar' });
  app.put('/terceros/:terceroId/cliente', {
    schema: { ...conTercero, body: esquemaPapelDeCliente },
    preHandler: clientes,
    handler: terceros.asignarCliente,
  });
  app.delete('/terceros/:terceroId/cliente', {
    schema: conTercero,
    preHandler: clientes,
    handler: terceros.quitarCliente,
  });
  app.put('/terceros/:terceroId/proveedor', {
    schema: { ...conTercero, body: esquemaPapelDeProveedor },
    preHandler: proveedores,
    handler: terceros.asignarProveedor,
  });
  app.delete('/terceros/:terceroId/proveedor', {
    schema: conTercero,
    preHandler: proveedores,
    handler: terceros.quitarProveedor,
  });
}

function rutasDeContactos(app: Aplicacion, contactos: ContactosControlador): void {
  const gestionar = proteger({ permiso: 'terceros.gestionar' });
  const url = '/terceros/:terceroId/contactos';
  app.get(url, { schema: conTercero, preHandler: proteger({ permiso: 'terceros.ver' }), handler: contactos.listar });
  app.post(url, {
    schema: { ...conTercero, body: esquemaContacto },
    preHandler: gestionar,
    handler: contactos.agregar,
  });
  app.put(`${url}/:contactoId`, {
    schema: { ...conContacto, body: esquemaContacto },
    preHandler: gestionar,
    handler: contactos.cambiar,
  });
  app.delete(`${url}/:contactoId`, { schema: conContacto, preHandler: gestionar, handler: contactos.eliminar });
}

function rutasDeCategorias(app: Aplicacion, categorias: CategoriasControlador): void {
  const gestionar = proteger({ permiso: 'proveedores.gestionar' });
  const url = '/proveedores/categorias';
  app.get(url, {
    schema: { tags: etiquetas },
    preHandler: proteger({ permiso: 'terceros.ver' }),
    handler: categorias.listar,
  });
  app.post(url, {
    schema: { tags: etiquetas, body: esquemaCategoria },
    preHandler: gestionar,
    handler: categorias.crear,
  });
  app.put(`${url}/:categoriaId`, {
    schema: { tags: etiquetas, params: esquemaParamsCategoria, body: esquemaCategoria },
    preHandler: gestionar,
    handler: categorias.cambiar,
  });
}

export function rutasTerceros(controladores: ControladoresDeTerceros): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeDatosGenerales(app, controladores.terceros);
    rutasDePapeles(app, controladores.terceros);
    rutasDeContactos(app, controladores.contactos);
    rutasDeCategorias(app, controladores.categorias);
  };
}
