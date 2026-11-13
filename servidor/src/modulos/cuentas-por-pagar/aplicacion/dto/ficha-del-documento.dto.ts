import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { AjusteDeSaldo } from '../../dominio/ajustes.js';
import type { AplicacionDeNota, DocumentoConAplicaciones } from '../../dominio/documento-por-pagar.js';
import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

export interface AplicacionDto {
  id: string;
  forma: 'automatica' | 'manual';
  fecha: string;
  referencia: string | null;
  notaId: string;
  cargoId: string;
  /** Dinero como texto con dos decimales. */
  monto: string;
}

/** El documento por pagar tal como lo ve la pantalla y tal como queda en la auditoría de una baja. */
export interface FichaDelDocumentoDto {
  id: string;
  origen: OrigenDeDocumento;
  documentoId: string | null;
  serie: string | null;
  numero: string;
  tipo: TipoDeDocumento;
  proveedorId: string;
  documentoAfectadoId: string | null;
  fechaEmision: string;
  total: string;
  retenciones: string;
  /** Solo un saldo inicial; nulos en los demás. */
  saldoAlInicio: string | null;
  retencionesPorPracticar: string | null;
  referencia: string | null;
  tieneActivoFijo: boolean;
  vencimiento: string | null;
  /** Quien lo registró en Libro de compras. */
  ingresadoPor: string | null;
  estado: EstadoDeDocumento;
  registradoEn: string | null;
  registradoPor: string | null;
  autorizadoEn: string | null;
  autorizadoPor: string | null;
  autorizacionPropia: boolean;
  /** Lo que esta nota de crédito rebajó de cada cargo. */
  aplicacionesHechas: AplicacionDto[];
  /** Lo que las notas de crédito rebajaron de este cargo. */
  aplicacionesRecibidas: AplicacionDto[];
  /** Los ajustes del saldo libre de esta nota, también los anulados (se van con ella si se elimina). */
  ajustes: AjusteDto[];
}

export interface AjusteDto {
  id: string;
  monto: string;
  fecha: string;
  causa: string;
  motivo: string;
  referencia: string | null;
  estado: 'vigente' | 'anulado';
  motivoDeAnulacion: string | null;
}

export const textoONulo = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

const aplicacionDto = ({
  id,
  forma,
  fecha,
  referencia,
  notaId,
  cargoId,
  montoCentavos,
}: AplicacionDeNota): AplicacionDto => ({
  id,
  forma,
  fecha,
  referencia,
  notaId,
  cargoId,
  monto: deCentavos(montoCentavos),
});

export const ajusteDto = ({ montoCentavos, documentoId: _documentoId, ...resto }: AjusteDeSaldo): AjusteDto => ({
  ...resto,
  monto: deCentavos(montoCentavos),
});

export function dtoDeFicha({ documento, hechas, recibidas, ajustes }: DocumentoConAplicaciones): FichaDelDocumentoDto {
  const { totalCentavos, retencionesCentavos, saldoAlInicioCentavos, retencionesPorPracticarCentavos, ...resto } =
    documento;
  return {
    ...resto,
    total: deCentavos(totalCentavos),
    retenciones: deCentavos(retencionesCentavos),
    saldoAlInicio: textoONulo(saldoAlInicioCentavos),
    retencionesPorPracticar: textoONulo(retencionesPorPracticarCentavos),
    aplicacionesHechas: hechas.map(aplicacionDto),
    aplicacionesRecibidas: recibidas.map(aplicacionDto),
    ajustes: ajustes.map(ajusteDto),
  };
}
