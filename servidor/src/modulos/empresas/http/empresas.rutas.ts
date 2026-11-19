import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { EmpresasControlador } from './empresas.controlador.js';
import { esquemaEmpresa, esquemaParamsEmpresa } from './empresas.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Empresas'];
const descripcion =
  'Responde la empresa y `avisos: string[]` (p. ej. otra empresa de la cuenta con el mismo NIT); no impiden guardar.';
const EN_EXCEL = {
  ruta: '/empresas',
  archivo: 'empresas',
  permisos: { importar: 'empresas.importar', exportar: 'empresas.exportar' },
};

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: EmpresasControlador) {
  const crear = proteger({ permiso: 'empresas.crear' });
  const editar = proteger({ permiso: 'empresas.editar' });

  app.post('/empresas', {
    schema: { tags: etiquetas, description: descripcion, body: esquemaEmpresa },
    preHandler: crear,
    handler: controlador.registrar,
  });
  app.put('/empresas/:empresaId', {
    schema: { tags: etiquetas, description: descripcion, params: esquemaParamsEmpresa, body: esquemaEmpresa },
    preHandler: editar,
    handler: controlador.actualizar,
  });
}

export function rutasEmpresas(
  controlador: EmpresasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.ver' });

    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
    app.get('/empresas', { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get('/empresas/:empresaId', {
      schema: { tags: etiquetas, params: esquemaParamsEmpresa },
      preHandler: ver,
      handler: controlador.obtener,
    });
    rutasDeEscritura(app, controlador);
  };
}
