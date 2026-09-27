import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/http/guardias.js';
import { contactosControlador } from '../controladores/contactos.controlador.js';
import { papelesControlador } from '../controladores/papeles.controlador.js';
import { tercerosControlador } from '../controladores/terceros.controlador.js';
import { esquemaContacto, esquemaParamsContacto } from '../validaciones/contactos.validaciones.js';
import {
  esquemaCategoriaProveedor,
  esquemaCliente,
  esquemaParamsCategoriaProveedor,
  esquemaProveedor,
  esquemaTrabajador,
} from '../validaciones/papeles.validaciones.js';
import { esquemaListarTerceros, esquemaParamsTercero, esquemaTercero } from '../validaciones/terceros.validaciones.js';

export const rutasTerceros: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Terceros'];
  const verTerceros = proteger({ permiso: 'terceros.ver' });
  const gestionarTerceros = proteger({ permiso: 'terceros.gestionar' });
  const gestionarClientes = proteger({ permiso: 'clientes.gestionar' });
  const gestionarProveedores = proteger({ permiso: 'proveedores.gestionar' });
  const gestionarTrabajadores = proteger({ permiso: 'trabajadores.gestionar' });

  app.get('/terceros', {
    schema: { tags, querystring: esquemaListarTerceros },
    preHandler: verTerceros,
    handler: tercerosControlador.listar,
  });

  app.get('/terceros/:terceroId', {
    schema: { tags, params: esquemaParamsTercero },
    preHandler: verTerceros,
    handler: tercerosControlador.obtener,
  });

  app.post('/terceros', {
    schema: { tags, body: esquemaTercero },
    preHandler: gestionarTerceros,
    handler: tercerosControlador.crear,
  });

  app.put('/terceros/:terceroId', {
    schema: { tags, params: esquemaParamsTercero, body: esquemaTercero },
    preHandler: gestionarTerceros,
    handler: tercerosControlador.actualizar,
  });

  // Contactos
  app.get('/terceros/:terceroId/contactos', {
    schema: { tags, params: esquemaParamsTercero },
    preHandler: verTerceros,
    handler: contactosControlador.listar,
  });

  app.post('/terceros/:terceroId/contactos', {
    schema: { tags, params: esquemaParamsTercero, body: esquemaContacto },
    preHandler: gestionarTerceros,
    handler: contactosControlador.crear,
  });

  app.put('/terceros/:terceroId/contactos/:contactoId', {
    schema: { tags, params: esquemaParamsContacto, body: esquemaContacto },
    preHandler: gestionarTerceros,
    handler: contactosControlador.actualizar,
  });

  app.delete('/terceros/:terceroId/contactos/:contactoId', {
    schema: { tags, params: esquemaParamsContacto },
    preHandler: gestionarTerceros,
    handler: contactosControlador.eliminar,
  });

  // Papel cliente
  app.put('/terceros/:terceroId/cliente', {
    schema: { tags, params: esquemaParamsTercero, body: esquemaCliente },
    preHandler: gestionarClientes,
    handler: papelesControlador.asignarCliente,
  });

  app.delete('/terceros/:terceroId/cliente', {
    schema: { tags, params: esquemaParamsTercero },
    preHandler: gestionarClientes,
    handler: papelesControlador.quitarCliente,
  });

  // Papel proveedor y sus categorías
  app.get('/proveedores/categorias', {
    schema: { tags },
    preHandler: verTerceros,
    handler: papelesControlador.listarCategorias,
  });

  app.post('/proveedores/categorias', {
    schema: { tags, body: esquemaCategoriaProveedor },
    preHandler: gestionarProveedores,
    handler: papelesControlador.crearCategoria,
  });

  app.put('/proveedores/categorias/:categoriaId', {
    schema: { tags, params: esquemaParamsCategoriaProveedor, body: esquemaCategoriaProveedor },
    preHandler: gestionarProveedores,
    handler: papelesControlador.actualizarCategoria,
  });

  app.put('/terceros/:terceroId/proveedor', {
    schema: { tags, params: esquemaParamsTercero, body: esquemaProveedor },
    preHandler: gestionarProveedores,
    handler: papelesControlador.asignarProveedor,
  });

  app.delete('/terceros/:terceroId/proveedor', {
    schema: { tags, params: esquemaParamsTercero },
    preHandler: gestionarProveedores,
    handler: papelesControlador.quitarProveedor,
  });

  // Papel trabajador (requiere ver los datos sensibles del trabajador)
  app.put('/terceros/:terceroId/trabajador', {
    schema: { tags, params: esquemaParamsTercero, body: esquemaTrabajador },
    preHandler: gestionarTrabajadores,
    handler: papelesControlador.asignarTrabajador,
  });

  app.delete('/terceros/:terceroId/trabajador', {
    schema: { tags, params: esquemaParamsTercero },
    preHandler: gestionarTrabajadores,
    handler: papelesControlador.quitarTrabajador,
  });
};
