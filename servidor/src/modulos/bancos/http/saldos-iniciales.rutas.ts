import type { preHandlerAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { limitarSubidas } from '../../core/archivos/http/limite-de-subidas.js';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { esquemaEliminacion } from './movimientos.esquemas-http.js';
import type { SaldosGlobalesControlador } from './saldos-globales.controlador.js';
import { rutasDeSaldosGlobales } from './saldos-globales.rutas.js';
import { esquemaFiltroDeSaldosGlobales } from './saldos-globales.esquemas-http.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import {
  esquemaAnulacionDePartida,
  esquemaCorreccionDePartida,
  esquemaGuardarSaldoInicial,
  esquemaParamsDeCuenta,
  esquemaParamsDePartida,
  esquemaPartida,
} from './saldos-iniciales.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];
type Intercambio = OpcionesDeIntercambio['intercambio'];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/saldos-iniciales';
const conCuenta = { tags: etiquetas, params: esquemaParamsDeCuenta };
const conPartida = { tags: etiquetas, params: esquemaParamsDePartida };

/** Guardar la cabecera: la ruta deja pasar con crear o con editar y el caso de uso exige el que corresponde. */
const crearOEditar: preHandlerAsyncHookHandler = async (solicitud) => {
  const { permisos } = contextoDe(solicitud);
  if (!permisos.has('bancos.saldos-iniciales.crear') && !permisos.has('bancos.saldos-iniciales.editar')) {
    throw new AccesoDenegado();
  }
};

function rutasDeLectura(app: Aplicacion, controlador: SaldosInicialesControlador, heredado: SaldosGlobalesControlador) {
  const ver = proteger({ permiso: 'bancos.saldos-iniciales.ver' });
  // Con `?cuentaBancariaId` responde lo de siempre (el cliente actual, hasta BS-5); sin él, la lista nueva.
  app.get(RUTA, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeSaldosGlobales },
    preHandler: ver,
    handler: (solicitud) =>
      solicitud.query.cuentaBancariaId
        ? heredado.listarDeLaCuenta(operadorDe(solicitud), solicitud.query.cuentaBancariaId)
        : controlador.listar(solicitud),
  });
  app.get(`${RUTA}/revision-de-cierre`, {
    schema: { tags: etiquetas },
    preHandler: ver,
    handler: controlador.revisionDeCierre,
  });
  app.get(`${RUTA}/:cuentaBancariaId`, { schema: conCuenta, preHandler: ver, handler: controlador.obtener });
}

function rutasDeLaCabecera(app: Aplicacion, controlador: SaldosInicialesControlador) {
  app.put(`${RUTA}/:cuentaBancariaId`, {
    schema: { ...conCuenta, body: esquemaGuardarSaldoInicial },
    preHandler: [proteger({ modulo: 'bancos' }), crearOEditar],
    handler: controlador.guardar,
  });
  app.delete(`${RUTA}/:cuentaBancariaId`, {
    schema: { ...conCuenta, body: esquemaEliminacion },
    preHandler: proteger({ permiso: 'bancos.saldos-iniciales.eliminar' }),
    handler: controlador.eliminar,
  });
}

function rutasDeLasPartidas(app: Aplicacion, controlador: SaldosInicialesControlador) {
  const crear = proteger({ permiso: 'bancos.saldos-iniciales.crear' });
  const editar = proteger({ permiso: 'bancos.saldos-iniciales.editar' });
  const eliminar = proteger({ permiso: 'bancos.saldos-iniciales.eliminar' });
  app.post(`${RUTA}/:cuentaBancariaId/partidas`, {
    schema: { ...conCuenta, body: esquemaPartida },
    preHandler: crear,
    handler: controlador.agregarPartida,
  });
  app.put(`${RUTA}/:cuentaBancariaId/partidas/:movimientoId`, {
    schema: { ...conPartida, body: esquemaCorreccionDePartida },
    preHandler: editar,
    handler: controlador.corregirPartida,
  });
  app.delete(`${RUTA}/:cuentaBancariaId/partidas/:movimientoId`, {
    schema: { ...conPartida, body: esquemaEliminacion },
    preHandler: eliminar,
    handler: controlador.eliminarPartida,
  });
}

/** La evidencia (PDF o foto): se sube y se quita con `.editar` (y la carga abierta), se abre con `.ver`. */
function rutasDeLaEvidencia(app: Aplicacion, controlador: SaldosInicialesControlador) {
  const editar = proteger({ permiso: 'bancos.saldos-iniciales.editar' });
  app.get(`${RUTA}/:cuentaBancariaId/evidencia`, {
    schema: conCuenta,
    preHandler: proteger({ permiso: 'bancos.saldos-iniciales.ver' }),
    handler: controlador.abrirEvidencia,
  });
  app.put(`${RUTA}/:cuentaBancariaId/evidencia`, {
    schema: { ...conCuenta, consumes: ['multipart/form-data'] },
    preHandler: [editar, limitarSubidas(app)],
    handler: controlador.subirEvidencia,
  });
  app.delete(`${RUTA}/:cuentaBancariaId/evidencia`, {
    schema: conCuenta,
    preHandler: editar,
    handler: controlador.quitarEvidencia,
  });
}

function rutaDeAnularPartida(app: Aplicacion, controlador: SaldosInicialesControlador) {
  app.post(`${RUTA}/:cuentaBancariaId/partidas/:movimientoId/anular`, {
    schema: { ...conPartida, body: esquemaAnulacionDePartida },
    preHandler: proteger({ permiso: 'bancos.saldos-iniciales.anular' }),
    handler: controlador.anularPartida,
  });
}

/**
 * Los saldos iniciales con partidas (docs/modulos/diseno-bancos-segunda-parte.md §8). Los dos Excel (saldos por cuenta
 * y partidas de apertura) importan con `.importar` y exportan con `.exportar`. Anular una partida lleva su propio permiso (`.anular`).
 */
export function rutasSaldosIniciales(
  controlador: SaldosInicialesControlador,
  heredado: SaldosGlobalesControlador,
  intercambios: { saldos: Intercambio; partidas: Intercambio },
): FastifyPluginAsyncZod {
  const permisos = { importar: 'bancos.saldos-iniciales.importar', exportar: 'bancos.saldos-iniciales.exportar' };
  return async (app) => {
    rutasDeLectura(app, controlador, heredado);
    await app.register(rutasDeSaldosGlobales(heredado));
    rutasDeLaCabecera(app, controlador);
    rutasDeLasPartidas(app, controlador);
    rutaDeAnularPartida(app, controlador);
    rutasDeLaEvidencia(app, controlador);
    rutasDeIntercambio(app, { ruta: RUTA, archivo: 'saldos-iniciales', permisos, intercambio: intercambios.saldos });
    rutasDeIntercambio(app, {
      ruta: `${RUTA}/partidas`,
      archivo: 'partidas-de-apertura',
      permisos,
      intercambio: intercambios.partidas,
    });
  };
}
