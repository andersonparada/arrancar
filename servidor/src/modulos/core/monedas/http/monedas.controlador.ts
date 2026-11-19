import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { ActualizarMonedasDelBanguat } from '../aplicacion/casos-uso/actualizar-monedas-del-banguat.js';
import type { EditarMoneda } from '../aplicacion/casos-uso/editar-moneda.js';
import type { ListarMonedas } from '../aplicacion/casos-uso/listar-monedas.js';
import type { ListarMonedasDelBanguat } from '../aplicacion/casos-uso/listar-monedas-del-banguat.js';
import type { VerMuestraDelBanguat } from '../aplicacion/casos-uso/ver-muestra-del-banguat.js';
import type { MonedaEditada, ParamsMoneda, ParamsMuestra, QueryMuestra } from './monedas.esquemas-http.js';

export interface CasosDeUsoDeMonedas {
  listar: ListarMonedas;
  listarDelBanguat: ListarMonedasDelBanguat;
  editar: EditarMoneda;
  actualizarLista: ActualizarMonedasDelBanguat;
  muestra: VerMuestraDelBanguat;
}

export class MonedasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMonedas) {}

  listar = () => this.casosDeUso.listar.ejecutar();

  listarDelBanguat = () => this.casosDeUso.listarDelBanguat.ejecutar();

  actualizarLista = async (solicitud: FastifyRequest) => {
    const consulta = await this.casosDeUso.actualizarLista.ejecutarAPedido(operadorDe(solicitud).usuarioId);
    return { consulta, lista: await this.casosDeUso.listarDelBanguat.ejecutar() };
  };

  muestra = (solicitud: FastifyRequest<{ Params: ParamsMuestra; Querystring: QueryMuestra }>) =>
    this.casosDeUso.muestra.ejecutar(solicitud.params.codigo, {
      usuarioId: operadorDe(solicitud).usuarioId,
      moneda: solicitud.query.moneda,
    });

  editar = (solicitud: FastifyRequest<{ Params: ParamsMoneda; Body: MonedaEditada }>) =>
    this.casosDeUso.editar.ejecutar(operadorDe(solicitud), solicitud.params.codigo, solicitud.body);
}
