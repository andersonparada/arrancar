import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { MedicionesControlador } from './mediciones.controlador.js';
import {
  esquemaAnulacionDeMedicion,
  esquemaMedicion,
  esquemaParamsDeParcelaMedicion,
  esquemaParamsMedicion,
} from './mediciones.esquemas-http.js';

const etiquetas = ['Parcelas'];

/** Las mediciones se ven con la ficha de la parcela (`parcelas.parcelas.ver`); aquí solo se registran y anulan. */
export function rutasMediciones(controlador: MedicionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/parcelas/parcelas/:parcelaId/mediciones', {
      schema: { tags: etiquetas, params: esquemaParamsDeParcelaMedicion, body: esquemaMedicion },
      preHandler: proteger({ permiso: 'parcelas.mediciones.crear' }),
      handler: controlador.registrar,
    });
    app.post('/parcelas/mediciones/:medicionId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsMedicion, body: esquemaAnulacionDeMedicion },
      preHandler: proteger({ permiso: 'parcelas.mediciones.anular' }),
      handler: controlador.anular,
    });
  };
}
