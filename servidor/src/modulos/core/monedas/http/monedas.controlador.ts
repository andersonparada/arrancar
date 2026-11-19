import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { EditarMoneda } from '../aplicacion/casos-uso/editar-moneda.js';
import type { ListarMonedas } from '../aplicacion/casos-uso/listar-monedas.js';
import type { ListarMonedasDelBanguat } from '../aplicacion/casos-uso/listar-monedas-del-banguat.js';
import type { MonedaEditada, ParamsMoneda } from './monedas.esquemas-http.js';

export interface CasosDeUsoDeMonedas {
  listar: ListarMonedas;
  listarDelBanguat: ListarMonedasDelBanguat;
  editar: EditarMoneda;
}

export class MonedasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMonedas) {}

  listar = () => this.casosDeUso.listar.ejecutar();

  listarDelBanguat = () => this.casosDeUso.listarDelBanguat.ejecutar();

  editar = (solicitud: FastifyRequest<{ Params: ParamsMoneda; Body: MonedaEditada }>) =>
    this.casosDeUso.editar.ejecutar(operadorDe(solicitud), solicitud.params.codigo, solicitud.body);
}
