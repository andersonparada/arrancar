import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { PaginacionDeDocumentos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type {
  ChequePosfechado,
  ConsultasDeReportesDePagos,
  FiltroDeChequesPosfechados,
  FiltroDePagosRealizados,
  PaginaDePagosRealizados,
} from '../../aplicacion/puertos/puertos-de-reportes-de-pagos.js';
import { chequesPosfechados } from './cheques-posfechados.drizzle.js';
import { pagosRealizados } from './pagos-realizados.drizzle.js';

/** Las consultas de R6 y R7. Corren dentro de la unidad de trabajo, con RLS de la empresa. */
export class ConsultaDeReportesDePagos implements ConsultasDeReportesDePagos {
  pagosRealizados(
    filtro: FiltroDePagosRealizados,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<PaginaDePagosRealizados> {
    return pagosRealizados(transaccionEnCurso(), filtro, pagina);
  }

  chequesPosfechados(filtro: FiltroDeChequesPosfechados): Promise<ChequePosfechado[]> {
    return chequesPosfechados(transaccionEnCurso(), filtro);
  }
}
