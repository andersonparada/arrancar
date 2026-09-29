import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { esquemaEliminacion, esquemaParamsMovimiento } from './movimientos.esquemas-http.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import { esquemaFiltroDeSaldosIniciales, esquemaSaldoInicial } from './saldos-iniciales.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/saldos-iniciales';
const conId = { tags: etiquetas, params: esquemaParamsMovimiento };
/** Importar y exportar (es administración): se ve en la ficha de la cuenta y en la lista de cuentas. */
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'saldos-iniciales',
  permisos: { importar: 'bancos.saldos-iniciales.importar', exportar: 'bancos.saldos-iniciales.exportar' },
};

/** No se anula (no aplica el inverso a un saldo inicial): se corrige o, si la cuenta sigue sin conciliaciones, se elimina. */
function rutasDeEscritura(app: Aplicacion, controlador: SaldosInicialesControlador) {
  const crear = proteger({ permiso: 'bancos.saldos-iniciales.crear' });
  const editar = proteger({ permiso: 'bancos.saldos-iniciales.editar' });
  const eliminar = proteger({ permiso: 'bancos.saldos-iniciales.eliminar' });
  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaSaldoInicial },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaSaldoInicial },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaEliminacion },
    preHandler: eliminar,
    handler: controlador.eliminar,
  });
}

/** Se ve con `bancos.cuentas-bancarias.ver` (aparece en la ficha de la cuenta); registrar, corregir y eliminar con `crear`, `editar` y `eliminar`. */
export function rutasSaldosIniciales(
  controlador: SaldosInicialesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltroDeSaldosIniciales },
      preHandler: proteger({ permiso: 'bancos.cuentas-bancarias.ver' }),
      handler: controlador.listar,
    });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
