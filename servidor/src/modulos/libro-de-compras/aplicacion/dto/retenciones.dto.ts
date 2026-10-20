import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { EstadoDelEntero } from '../../dominio/retenciones/estado-del-entero.js';
import { GRUPO_DE_ENTERO, type GrupoDeEntero } from '../../dominio/retenciones/grupo-de-entero.js';
import type { AccionSugerida, ResolucionDeRetencion } from '../../dominio/retenciones/resolucion-de-retencion.js';
import type { EnteroGuardado, RetencionDelReporte } from '../../dominio/retenciones/retencion-del-reporte.js';
import type { ImpuestoRetenido, ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';

/** Una retención del reporte; el dinero viaja como texto. */
export interface RetencionDto {
  id: string;
  impuesto: ImpuestoRetenido;
  regla: ReglaDeRetencion;
  grupo: GrupoDeEntero;
  /** La fecha de la retención: recepción en el IVA, emisión en el ISR. */
  fecha: string;
  base: string;
  /** Porcentaje con dos decimales; `null` en el ISR por escalones. */
  porcentaje: string | null;
  propuesto: string;
  retenido: string;
  /** `true` si el usuario la dejó en cero: no se retuvo nada y no suma. */
  enCero: boolean;
  motivoDelAjuste: string | null;
  constanciaNumero: string | null;
  constanciaFecha: string | null;
  documento: {
    id: string;
    estado: 'vigente' | 'anulado';
    tipoDte: string | null;
    serie: string | null;
    numero: string;
    /** El UUID de la FEL. */
    uuid: string | null;
    fechaEmision: string;
  };
  proveedor: { id: string; nit: string | null; nombre: string };
}

export interface CantidadDto {
  cantidad: number;
  monto: string;
}

export interface ReglaDelGrupoDto {
  regla: ReglaDeRetencion;
  impuesto: ImpuestoRetenido;
  cantidad: number;
  base: string;
  retenido: string;
}

export interface EnteroDto {
  id: string;
  mes: string;
  grupo: GrupoDeEntero;
  fechaDePago: string;
  documentoDePago: string;
  monto: string;
  retenidoAlMarcar: string;
  observaciones: string | null;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  registradoPor: string | null;
}

/** Un grupo de entero en un mes: lo retenido por regla, el plazo y el estado del pago. */
export interface GrupoDelReporteDto {
  grupo: GrupoDeEntero;
  nombre: string;
  mes: string;
  /** Último día para enterar, con el calendario de feriados. */
  plazo: string;
  retenido: string;
  pagado: string;
  /** Retenido menos pagado (puede ser negativo). */
  diferencia: string;
  estado: EstadoDelEntero;
  /** Solo si el plazo venció y no hay ningún pago vigente; con pagos el aviso se apaga. */
  aviso: string | null;
  reglas: ReglaDelGrupoDto[];
  conConstancia: CantidadDto;
  sinConstancia: CantidadDto;
  pagos: EnteroDto[];
}

export interface ReporteDeRetencionesDto {
  mes: string;
  filtros: {
    grupo: GrupoDeEntero | null;
    constancia: 'con' | 'sin' | 'todas';
    documentos: 'vigentes' | 'anulados' | 'todos';
  };
  /** Los cuatro grupos, también los que no tuvieron retenciones; sus totales no dependen del filtro de constancia. */
  grupos: GrupoDelReporteDto[];
  /** Retenciones de documentos vigentes, con las que están en cero marcadas. */
  retenciones: RetencionDto[];
  /** De documentos anulados: aparte, no suman a lo retenido del mes. */
  anuladas: RetencionDto[];
}

/** Una retención por resolver (o ya resuelta) con lo que hace falta para decidir. */
export interface RetencionPorResolverDto extends RetencionDto {
  resolucion: ResolucionDeRetencion;
  nota: string | null;
  resueltaEn: string | null;
  resueltaPor: string | null;
  motivoDeAnulacionDelDocumento: string | null;
  /** El mes y grupo de la retención tiene algún entero vigente. */
  enterada: boolean;
  accionSugerida: AccionSugerida;
}

/** Un mes de la matriz: los cuatro grupos, sin el detalle por regla ni por constancia (eso lo da el reporte del mes). */
export interface MesDeEnterosDto {
  mes: string;
  grupos: GrupoDelReporteDto[];
}

export interface MatrizDeEnterosDto {
  anio: number;
  meses: MesDeEnterosDto[];
}

export interface ResultadoDeEnteroDto {
  entero: EnteroDto;
  avisos: string[];
}

export interface ConstanciaAnotadaDto {
  retencion: RetencionDto;
  avisos: string[];
}

const textoDelPorcentaje = (centesimas: number | null): string | null =>
  centesimas === null ? null : deCentavos(centesimas);

function dtoDelDocumento({ documento }: RetencionDelReporte): RetencionDto['documento'] {
  return {
    id: documento.id,
    estado: documento.estado,
    tipoDte: documento.tipoDte,
    serie: documento.serie,
    numero: documento.numero,
    uuid: documento.autorizacionFel,
    fechaEmision: documento.fechaEmision,
  };
}

export function dtoDeRetencion(retencion: RetencionDelReporte): RetencionDto {
  return {
    id: retencion.id,
    impuesto: retencion.impuesto,
    regla: retencion.regla,
    grupo: GRUPO_DE_ENTERO[retencion.regla],
    fecha: retencion.fecha,
    base: deCentavos(retencion.base),
    porcentaje: textoDelPorcentaje(retencion.porcentaje),
    propuesto: deCentavos(retencion.montoPropuesto),
    retenido: deCentavos(retencion.monto),
    enCero: retencion.monto === 0,
    motivoDelAjuste: retencion.motivoDelAjuste,
    constanciaNumero: retencion.constancia?.numero ?? null,
    constanciaFecha: retencion.constancia?.fecha ?? null,
    documento: dtoDelDocumento(retencion),
    proveedor: retencion.proveedor,
  };
}

export function dtoDeEntero(entero: EnteroGuardado): EnteroDto {
  return {
    ...entero,
    monto: deCentavos(entero.monto),
    retenidoAlMarcar: deCentavos(entero.retenidoAlMarcar),
  };
}
