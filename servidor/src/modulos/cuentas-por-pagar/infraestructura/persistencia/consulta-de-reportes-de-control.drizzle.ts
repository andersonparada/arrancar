import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AjusteDelMes,
  AplicacionManualDelMes,
  ConsultasDeReportesDeControl,
  DocumentoRevertidoEnElMes,
  FiltroDeAjustesDelMes,
  PagoAAperturaDelMes,
  SeccionDeAjustes,
} from '../../aplicacion/puertos/puertos-de-reportes-de-control.js';
import { ajustesDelMes, aplicacionesManualesDelMes, pagosAAperturaDelMes } from './ajustes-del-mes.drizzle.js';
import { documentosAnuladosEnElMes, documentosDesautorizadosEnElMes } from './documentos-revertidos.drizzle.js';

/** Las consultas de R8. Corren dentro de la unidad de trabajo, con RLS de la empresa. */
export class ConsultaDeReportesDeControl implements ConsultasDeReportesDeControl {
  ajustes(filtro: FiltroDeAjustesDelMes, seccion: SeccionDeAjustes): Promise<AjusteDelMes[]> {
    return ajustesDelMes(transaccionEnCurso(), filtro, seccion);
  }

  aplicacionesManuales(filtro: FiltroDeAjustesDelMes): Promise<AplicacionManualDelMes[]> {
    return aplicacionesManualesDelMes(transaccionEnCurso(), filtro);
  }

  pagosAApertura(filtro: FiltroDeAjustesDelMes): Promise<PagoAAperturaDelMes[]> {
    return pagosAAperturaDelMes(transaccionEnCurso(), filtro);
  }

  documentosAnulados(filtro: FiltroDeAjustesDelMes): Promise<DocumentoRevertidoEnElMes[]> {
    return documentosAnuladosEnElMes(transaccionEnCurso(), filtro);
  }

  documentosDesautorizados(filtro: FiltroDeAjustesDelMes): Promise<DocumentoRevertidoEnElMes[]> {
    return documentosDesautorizadosEnElMes(transaccionEnCurso(), filtro);
  }
}
