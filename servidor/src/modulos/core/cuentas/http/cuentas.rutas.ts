import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { CuentasControlador } from './cuentas.controlador.js';
import {
  esquemaAltaCuenta,
  esquemaCambioCuenta,
  esquemaParamsCuenta,
  esquemaParamsModuloCuenta,
} from './cuentas.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Plataforma'];

function rutasDeCuentas(app: Aplicacion, cuentas: CuentasControlador): void {
  const soloSoporte = proteger({ soloSuperacceso: true });
  app.get('/plataforma/cuentas', { schema: { tags }, preHandler: soloSoporte, handler: cuentas.listar });
  app.post('/plataforma/cuentas', {
    schema: { tags, body: esquemaAltaCuenta },
    preHandler: soloSoporte,
    handler: cuentas.darDeAlta,
  });
  app.patch('/plataforma/cuentas/:cuentaId', {
    schema: { tags, params: esquemaParamsCuenta, body: esquemaCambioCuenta },
    preHandler: soloSoporte,
    handler: cuentas.cambiar,
  });
}

function rutasDeModulos(app: Aplicacion, cuentas: CuentasControlador): void {
  const soloSoporte = proteger({ soloSuperacceso: true });
  const deUnaCuenta = { tags, params: esquemaParamsModuloCuenta };
  app.get('/plataforma/modulos', { schema: { tags }, preHandler: soloSoporte, handler: cuentas.listarCatalogo });
  app.get('/plataforma/cuentas/:cuentaId/modulos', {
    schema: { tags, params: esquemaParamsCuenta },
    preHandler: soloSoporte,
    handler: cuentas.listarModulos,
  });
  app.put('/plataforma/cuentas/:cuentaId/modulos/:clave', {
    schema: deUnaCuenta,
    preHandler: soloSoporte,
    handler: cuentas.activarModulo,
  });
  app.delete('/plataforma/cuentas/:cuentaId/modulos/:clave', {
    schema: deUnaCuenta,
    preHandler: soloSoporte,
    handler: cuentas.desactivarModulo,
  });
}

/** Rutas de soporte: todas exigen superacceso y no dependen de una empresa activa. */
export function rutasCuentas(cuentas: CuentasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeCuentas(app, cuentas);
    rutasDeModulos(app, cuentas);
  };
}
