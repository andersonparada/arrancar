import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { SolicitudDeAnalisis } from '../aplicacion/casos-uso/analisis/definicion-de-analisis.js';
import type { ConsultaDeAnalisisSolicitada } from './analisis.esquemas-http.js';

/** Un análisis ya compuesto: su ruta y las dos cosas que se le piden. */
export interface AnalisisPublicado {
  ruta: string;
  consultar: { ejecutar(operador: Operador, solicitud: SolicitudDeAnalisis): Promise<unknown> };
  exportar: {
    ejecutar(operador: Operador, solicitud: SolicitudDeAnalisis): Promise<{ nombre: string; contenido: Buffer }>;
  };
}

type Solicitud = FastifyRequest<{ Querystring: ConsultaDeAnalisisSolicitada }>;

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const solicitudDe = ({ query }: Solicitud): SolicitudDeAnalisis => ({
  desde: query.desde,
  hasta: query.hasta,
  incluirFueraDelLibro: query.incluirFueraDelLibro === 'true',
});

/** Traduce las peticiones HTTP de un análisis a sus casos de uso; no contiene reglas de negocio. */
export class AnalisisControlador {
  constructor(private readonly analisis: AnalisisPublicado) {}

  consultar = (solicitud: Solicitud) => this.analisis.consultar.ejecutar(operadorDe(solicitud), solicitudDe(solicitud));

  exportar = async (solicitud: Solicitud, respuesta: FastifyReply) => {
    const { nombre, contenido } = await this.analisis.exportar.ejecutar(operadorDe(solicitud), solicitudDe(solicitud));
    return respuesta
      .header('Content-Type', TIPO_EXCEL)
      .header('Content-Disposition', `attachment; filename="${nombre}"`)
      .send(contenido);
  };
}
