import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { fijarRetenciones } from '../../../dominio/ajuste-de-retenciones.js';
import { calcularDocumento, type DocumentoCalculado } from '../../../dominio/calculo-de-documento.js';
import { calcularRetenciones } from '../../../dominio/calculador-de-retenciones.js';
import type { DocumentoDeCompra, RetencionDeDocumento } from '../../../dominio/documento-de-compra.js';
import { primerDiaDelMes } from '../../../dominio/periodo-del-libro.js';
import {
  aplicarRetencionPracticada,
  type DocumentoAnuladoConRetenciones,
  type RetencionesConPracticada,
} from '../../../dominio/retencion-practicada.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { FacturaParaNota } from '../../puertos/puertos-de-documentos.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';
import type { EncabezadoResuelto } from './encabezado-del-documento.js';
import type { LineasResueltas } from './resolutor-de-lineas.js';

/** Todo lo que se resolvió y calculó de un documento, antes de armarlo. */
export interface DocumentoResuelto {
  encabezado: EncabezadoResuelto;
  lineas: LineasResueltas;
  factura: FacturaParaNota | null;
  calculado: DocumentoCalculado;
  retenciones: RetencionDeDocumento[];
  /** Lo que el sistema dejó en cero por una retención ya practicada en un documento anulado, y su aviso. */
  practicada: Pick<RetencionesConPracticada, 'enCero' | 'avisos'>;
}

/** Calcula líneas, IVA y motivo del documento con lo que ya se resolvió (reglas de `calcularDocumento`). */
export function calcularElDocumento(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  resuelto: Pick<DocumentoResuelto, 'encabezado' | 'lineas' | 'factura'>,
): DocumentoCalculado {
  const { factura } = resuelto;
  return calcularDocumento({
    tipo: solicitud.tipo,
    muestraEnReportesSat: resuelto.encabezado.muestraEnReportesSat,
    noVinculado: solicitud.noVinculado,
    fechaDeEmision: solicitud.fechaEmision,
    fechaDeRecepcion: contexto.fechaDeRecepcion,
    periodo: contexto.periodo,
    lineas: resuelto.lineas.escritas,
    tasaDeIva: contexto.configuracion.tasaDeIva,
    ivaDeLaFel: solicitud.ivaDeLaFel === null ? null : aCentavos(solicitud.ivaDeLaFel),
    mesActual: primerDiaDelMes(contexto.hoy),
    ...(factura && {
      motivoDeLaFactura: factura.motivoSinCredito,
      ivaDeLaFactura: factura.iva,
      ivaRebajadoPorOtrasNotas: factura.ivaDeNotas,
    }),
  });
}

/**
 * Las retenciones que propone el sistema (en cero las ya practicadas en un documento anulado), con los ajustes del
 * usuario ya aplicados y fijadas con su fecha.
 */
export function retencionesDelDocumento(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  resuelto: Pick<DocumentoResuelto, 'encabezado' | 'lineas' | 'calculado'> & {
    anulado: DocumentoAnuladoConRetenciones | null;
  },
): Pick<DocumentoResuelto, 'retenciones' | 'practicada'> {
  const calculadas = calcularRetenciones({
    tipo: solicitud.tipo,
    muestraEnReportesSat: resuelto.encabezado.muestraEnReportesSat,
    documento: resuelto.calculado,
    datosDeLineas: resuelto.lineas.paraRetencion,
    empresa: contexto.datosDeLaEmpresa,
    proveedor: contexto.datosDelProveedor,
    configuracion: contexto.configuracion.retenciones,
  });
  const { propuestas, ...practicada } = aplicarRetencionPracticada(calculadas, resuelto.anulado);
  const ajustes = solicitud.ajustesDeRetenciones.map((ajuste) => ({
    regla: ajuste.regla,
    monto: aCentavos(ajuste.monto),
    motivo: ajuste.motivo,
  }));
  const fechas = { emision: solicitud.fechaEmision, recepcion: contexto.fechaDeRecepcion };
  return { retenciones: fijarRetenciones(propuestas, ajustes, fechas), practicada };
}

type EncabezadoDeDocumento = Omit<DocumentoDeCompra, 'totales' | 'lineas' | 'retenciones'>;
type DatosDelEncabezado = { contexto: ContextoFiscal } & Pick<DocumentoResuelto, 'encabezado' | 'calculado'>;
type Identidad = Pick<
  EncabezadoDeDocumento,
  'id' | 'empresaId' | 'tipo' | 'proveedorId' | 'nitEmisor' | 'nombreEmisor' | 'nitReceptor' | 'serie' | 'numero'
>;

/** Quién emite, a quién y qué número lleva. */
function identidadDelDocumento(
  operador: Operador,
  solicitud: SolicitudDeDocumento,
  { contexto, encabezado }: DatosDelEncabezado,
): Identidad {
  return {
    id: crypto.randomUUID(),
    empresaId: operador.empresaId,
    tipo: solicitud.tipo,
    proveedorId: contexto.proveedor.id,
    nitEmisor: encabezado.emisor.nitEmisor,
    nombreEmisor: contexto.proveedor.nombre,
    nitReceptor: encabezado.nitReceptor,
    serie: solicitud.serie,
    numero: solicitud.numero,
  };
}

/** Fechas, casilla SAT, motivos, factura afectada y destino. */
function condicionesDelDocumento(
  solicitud: SolicitudDeDocumento,
  { contexto, encabezado, calculado }: DatosDelEncabezado,
): Omit<EncabezadoDeDocumento, keyof Identidad> {
  return {
    autorizacionFel: solicitud.autorizacionFel,
    fechaEmision: solicitud.fechaEmision,
    fechaRecepcion: contexto.fechaDeRecepcion,
    periodo: contexto.periodo,
    muestraEnReportesSat: encabezado.muestraEnReportesSat,
    motivoFueraDelLibro: solicitud.motivoFueraDelLibro,
    motivoSinCredito: calculado.motivoSinCredito,
    documentoAfectadoId: solicitud.documentoAfectadoId,
    destino: solicitud.destino,
    observaciones: solicitud.observaciones,
  };
}

/** Junta lo resuelto y calculado en el documento que se guarda: encabezado, totales, líneas y retenciones. */
export function armarDocumento(
  operador: Operador,
  solicitud: SolicitudDeDocumento,
  datos: { contexto: ContextoFiscal } & DocumentoResuelto,
): DocumentoDeCompra {
  const { lineas, calculado, retenciones } = datos;
  return {
    ...identidadDelDocumento(operador, solicitud, datos),
    ...condicionesDelDocumento(solicitud, datos),
    totales: calculado.totales,
    lineas: lineas.descripciones.map((descripcion, indice) => ({ ...descripcion, ...calculado.lineas[indice]! })),
    retenciones,
  };
}
