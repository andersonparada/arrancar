import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { AgregarAsueto } from '../aplicacion/casos-uso/agregar-asueto.js';
import type { ListarFeriados } from '../aplicacion/casos-uso/listar-feriados.js';
import type { QuitarAsueto } from '../aplicacion/casos-uso/quitar-asueto.js';
import type { AsuetoSolicitado, ConsultaFeriados, ParamsAsueto } from './feriados.esquemas-http.js';

export interface CasosDeUsoDeFeriados {
  listar: ListarFeriados;
  agregar: AgregarAsueto;
  quitar: QuitarAsueto;
}

export class FeriadosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeFeriados) {}

  listar = (solicitud: FastifyRequest<{ Querystring: ConsultaFeriados }>) =>
    this.casosDeUso.listar.ejecutar(solicitud.query.anio);

  agregar = async (solicitud: FastifyRequest<{ Body: AsuetoSolicitado }>, respuesta: FastifyReply) => {
    const creado = await this.casosDeUso.agregar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(creado);
  };

  quitar = async (solicitud: FastifyRequest<{ Params: ParamsAsueto }>, respuesta: FastifyReply) => {
    await this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), solicitud.params.id);
    return respuesta.status(204).send();
  };
}
