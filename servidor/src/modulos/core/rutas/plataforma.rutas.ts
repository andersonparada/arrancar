import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { plataformaControlador } from '../controladores/plataforma.controlador.js';
import { proteger } from '../compartido/http/guardias.js';
import {
  esquemaAltaCuenta,
  esquemaCambioCuenta,
  esquemaParamsCuenta,
  esquemaParamsModuloCuenta,
} from '../validaciones/plataforma.validaciones.js';

/** Rutas de soporte: todas exigen superacceso y no dependen de una empresa activa. */
export const rutasPlataforma: FastifyPluginAsyncZod = async (app) => {
  const soloSoporte = proteger({ soloSuperacceso: true });
  const tags = ['Plataforma'];

  app.get('/plataforma/cuentas', {
    schema: { tags },
    preHandler: soloSoporte,
    handler: plataformaControlador.listarCuentas,
  });

  app.post('/plataforma/cuentas', {
    schema: { tags, body: esquemaAltaCuenta },
    preHandler: soloSoporte,
    handler: plataformaControlador.crearCuenta,
  });

  app.patch('/plataforma/cuentas/:cuentaId', {
    schema: { tags, params: esquemaParamsCuenta, body: esquemaCambioCuenta },
    preHandler: soloSoporte,
    handler: plataformaControlador.actualizarCuenta,
  });

  app.get('/plataforma/modulos', {
    schema: { tags },
    preHandler: soloSoporte,
    handler: plataformaControlador.listarCatalogoModulos,
  });

  app.get('/plataforma/cuentas/:cuentaId/modulos', {
    schema: { tags, params: esquemaParamsCuenta },
    preHandler: soloSoporte,
    handler: plataformaControlador.listarModulosDeCuenta,
  });

  app.put('/plataforma/cuentas/:cuentaId/modulos/:clave', {
    schema: { tags, params: esquemaParamsModuloCuenta },
    preHandler: soloSoporte,
    handler: plataformaControlador.activarModulo,
  });

  app.delete('/plataforma/cuentas/:cuentaId/modulos/:clave', {
    schema: { tags, params: esquemaParamsModuloCuenta },
    preHandler: soloSoporte,
    handler: plataformaControlador.desactivarModulo,
  });
};
