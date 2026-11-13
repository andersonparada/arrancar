import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';

/** Importar (con su plantilla) y exportar los saldos iniciales en Excel; cada acción con su permiso. */
export const rutasDeExcelDeSaldosIniciales =
  (intercambio: OpcionesDeIntercambio['intercambio']): FastifyPluginAsyncZod =>
  async (app) => {
    rutasDeIntercambio(app, {
      ruta: '/cuentas-por-pagar/saldos-iniciales',
      archivo: 'saldos-iniciales',
      permisos: {
        importar: 'cuentas-por-pagar.saldos-iniciales.importar',
        exportar: 'cuentas-por-pagar.saldos-iniciales.exportar',
      },
      intercambio,
    });
  };
