import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';

/** Importar (con su plantilla) y exportar los plazos de los proveedores en Excel; cada acción con su permiso. */
export const rutasDeExcelDePlazos =
  (intercambio: OpcionesDeIntercambio['intercambio']): FastifyPluginAsyncZod =>
  async (app) => {
    rutasDeIntercambio(app, {
      ruta: '/cuentas-por-pagar/condiciones',
      archivo: 'plazos-de-proveedores',
      permisos: {
        importar: 'cuentas-por-pagar.condiciones.importar',
        exportar: 'cuentas-por-pagar.condiciones.exportar',
      },
      intercambio,
    });
  };
