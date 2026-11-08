import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { accionesDelDocumento } from '../../dominio/acciones-posibles.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { estaVencido, saldoDe, type SaldoDelDocumento } from '../../dominio/saldos.js';
import { claseDe } from '../../dominio/tipos-de-documento.js';
import type { AplicacionConDatos, FilaDeDocumento, NotaDeUnDocumento } from '../puertos/puertos-de-consultas.js';
import type {
  AnulacionDelDocumentoDto,
  AplicacionDelDocumentoDto,
  DocumentoPorPagarDto,
  NotaDelDocumentoDto,
} from './documento-por-pagar.dto.js';

/** Quien opera y qué día es hoy: lo que cambia de un usuario y de un día a otro en la misma fila. */
export interface PuntoDeVista {
  usuarioId: string;
  /** `AAAA-MM-DD`, en la zona horaria de la empresa. */
  hoy: string;
}

type Identificacion = Pick<
  DocumentoPorPagarDto,
  'id' | 'documentoId' | 'tipo' | 'clase' | 'estado' | 'proveedorId' | 'documentoAfectadoId' | 'tieneActivoFijo'
>;

const identificacionDe = (documento: DocumentoPorPagar): Identificacion => ({
  id: documento.id,
  documentoId: documento.documentoId,
  tipo: documento.tipo,
  clase: claseDe(documento.tipo),
  estado: documento.estado,
  proveedorId: documento.proveedorId,
  documentoAfectadoId: documento.documentoAfectadoId,
  tieneActivoFijo: documento.tieneActivoFijo,
});

const origenDe = ({ origen, documento }: FilaDeDocumento) => ({
  proveedorNombre: origen.proveedorNombre,
  serie: origen.serie,
  numero: origen.numero,
  fechaEmision: documento.fechaEmision,
  fechaRecepcion: origen.fechaRecepcion,
  periodo: origen.periodo,
});

const montosDe = (documento: DocumentoPorPagar, saldo: SaldoDelDocumento) => ({
  total: deCentavos(documento.totalCentavos),
  retenciones: deCentavos(documento.retencionesCentavos),
  neto: deCentavos(saldo.netoCentavos),
  aplicado: deCentavos(saldo.aplicadoCentavos),
  saldo: deCentavos(saldo.saldoCentavos),
});

const seguimientoDe = (documento: DocumentoPorPagar, usuarioId: string) => ({
  esPropio: documento.registradoPor === usuarioId || documento.ingresadoPor === usuarioId,
  registradoEn: documento.registradoEn,
  autorizadoEn: documento.autorizadoEn,
  autorizacionPropia: documento.autorizacionPropia,
});

/** El documento tal como lo ven la bandeja, la lista y la ficha, con sus saldos y lo que se puede hacer con él. */
export function dtoDeDocumentoPorPagar(fila: FilaDeDocumento, vista: PuntoDeVista): DocumentoPorPagarDto {
  const { documento, notasVigentes, notasEnTotal } = fila;
  const aplicado = { alCargoCentavos: fila.aplicadoAlCargoCentavos, porLaNotaCentavos: fila.aplicadoPorLaNotaCentavos };
  const saldo = saldoDe(documento, aplicado);
  return {
    ...identificacionDe(documento),
    ...origenDe(fila),
    ...montosDe(documento, saldo),
    ...seguimientoDe(documento, vista.usuarioId),
    vencimiento: documento.vencimiento,
    vencido: estaVencido(documento, saldo.saldoCentavos, vista.hoy),
    ...accionesDelDocumento({ tipo: documento.tipo, estado: documento.estado, notasVigentes, notasEnTotal }),
  };
}

/** Cómo se anuló el documento; `null` si sigue vigente. */
export function dtoDeAnulacion({ documento, origen }: FilaDeDocumento): AnulacionDelDocumentoDto | null {
  if (documento.estado !== 'anulado') return null;
  const { causa, motivo, anuladoPor, anuladoEn } = origen.anulacion;
  return { causa, motivo, anuladoPor, anuladoEn: anuladoEn?.toISOString() ?? null };
}

export function dtoDeNota(nota: NotaDeUnDocumento): NotaDelDocumentoDto {
  const { totalCentavos, aplicadoAlDocumentoCentavos, ...resto } = nota;
  return {
    ...resto,
    total: deCentavos(totalCentavos),
    aplicadoAEsteDocumento: deCentavos(aplicadoAlDocumentoCentavos),
  };
}

export function dtoDeAplicacion({ montoCentavos, ...resto }: AplicacionConDatos): AplicacionDelDocumentoDto {
  return { ...resto, monto: deCentavos(montoCentavos) };
}
