import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { GrupoDeEntero } from '../../dominio/retenciones/grupo-de-entero.js';
import type { ResolucionDeRetencion } from '../../dominio/retenciones/resolucion-de-retencion.js';
import type { EnteroGuardado, RetencionDelReporte } from '../../dominio/retenciones/retencion-del-reporte.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { documentos } from './documentos.tablas.js';
import type { enterosDeRetenciones } from './enteros-de-retenciones.tablas.js';
import type { retenciones } from './retenciones.tablas.js';

/** Lo que se lee de una retención con su documento, el NIT del proveedor y el nombre de quien la resolvió. */
export interface FilaLeidaDeRetencion {
  retencion: typeof retenciones.$inferSelect;
  documento: typeof documentos.$inferSelect;
  nit: string | null;
  nombres: string | null;
  apellidos: string | null;
}

const nombreDe = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

function constanciaDe({ constanciaNumero, constanciaFecha }: typeof retenciones.$inferSelect) {
  if (constanciaNumero === null || constanciaFecha === null) return null;
  return { numero: constanciaNumero, fecha: constanciaFecha };
}

function documentoDe(d: typeof documentos.$inferSelect): RetencionDelReporte['documento'] {
  return {
    id: d.id,
    estado: d.estado,
    tipoDte: d.tipoDte,
    serie: d.serie,
    numero: d.numero,
    autorizacionFel: d.autorizacionFel,
    fechaEmision: d.fechaEmision,
    motivoDeAnulacion: d.motivoDeAnulacion,
  };
}

export function retencionDelReporte(fila: FilaLeidaDeRetencion): RetencionDelReporte {
  const { retencion: r, documento: d } = fila;
  return {
    id: r.id,
    impuesto: r.impuesto,
    regla: r.regla as ReglaDeRetencion,
    base: aCentavos(r.base),
    porcentaje: r.porcentaje === null ? null : aCentavos(r.porcentaje),
    montoPropuesto: aCentavos(r.montoPropuesto),
    monto: aCentavos(r.monto),
    motivoDelAjuste: r.motivoDelAjuste,
    fecha: r.fecha,
    constancia: constanciaDe(r),
    resolucion: r.resolucion as ResolucionDeRetencion | null,
    notaDeResolucion: r.notaDeResolucion,
    resueltaEn: r.resueltaEn?.toISOString() ?? null,
    resueltaPor: nombreDe(fila.nombres, fila.apellidos) ?? r.resueltaPor,
    documento: documentoDe(d),
    proveedor: { id: d.proveedorId, nit: fila.nit, nombre: d.nombreEmisor },
  };
}

/** Lo que se lee de un entero y de quien lo registró. */
export interface FilaLeidaDeEntero {
  entero: typeof enterosDeRetenciones.$inferSelect;
  nombres: string | null;
  apellidos: string | null;
}

export function enteroGuardado({ entero: e, nombres, apellidos }: FilaLeidaDeEntero): EnteroGuardado {
  return {
    id: e.id,
    mes: e.mes,
    grupo: e.grupo as GrupoDeEntero,
    fechaDePago: e.fechaDePago,
    documentoDePago: e.documentoDePago,
    monto: aCentavos(e.monto),
    retenidoAlMarcar: aCentavos(e.retenidoAlMarcar),
    observaciones: e.observaciones,
    estado: e.estado,
    anuladoEn: e.anuladoEn?.toISOString() ?? null,
    motivoDeAnulacion: e.motivoDeAnulacion,
    registradoPor: nombreDe(nombres, apellidos) ?? e.creadoPor,
  };
}
