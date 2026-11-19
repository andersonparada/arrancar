import { and, eq } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { comprobantes } from './comprobantes.tablas.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/** Un comprobante con lo del libro y la reposición vigente, tal como lo devuelve la consulta de `comprobantesConSuContexto`. */
interface FilaDeComprobante {
  comprobante: typeof comprobantes.$inferSelect;
  documento: {
    tipo: string;
    serie: string | null;
    numero: string;
    nombreEmisor: string;
    fechaEmision: string;
    total: string;
    enElLibro: boolean;
    motivoFueraDelLibro: string | null;
  } | null;
  reposicionNumero: number | null;
}

/**
 * La consulta base de los comprobantes: une el documento del libro (nombre, serie, número, total y si está en el libro)
 * y la reposición vigente, si la hay. Quien la usa agrega `where` y orden.
 */
export function comprobantesConSuContexto() {
  return transaccionEnCurso()
    .select({
      comprobante: comprobantes,
      documento: {
        tipo: documentos.tipo,
        serie: documentos.serie,
        numero: documentos.numero,
        nombreEmisor: documentos.nombreEmisor,
        fechaEmision: documentos.fechaEmision,
        total: documentos.total,
        enElLibro: documentos.muestraEnReportesSat,
        motivoFueraDelLibro: documentos.motivoFueraDelLibro,
      },
      reposicionNumero: reposiciones.numero,
    })
    .from(comprobantes)
    .leftJoin(documentos, eq(documentos.id, comprobantes.documentoDeCompraId))
    .leftJoin(
      reposicionComprobantes,
      and(eq(reposicionComprobantes.comprobanteId, comprobantes.id), eq(reposicionComprobantes.vigente, true)),
    )
    .leftJoin(reposiciones, eq(reposiciones.id, reposicionComprobantes.reposicionId));
}

/** Lo del comprobante que es dinero, fechas y el documento del libro. */
function datosDelDocumento(c: FilaDeComprobante['comprobante']) {
  return {
    id: c.id,
    fondoId: c.fondoId,
    clase: c.clase,
    estado: c.estado,
    fecha: c.fecha,
    montoCentavos: aCentavos(c.monto),
    resta: c.resta,
    esNotaDeCredito: c.esNotaDeCredito,
    documentoDeCompraId: c.documentoDeCompraId,
    documentoAfectadoId: c.documentoAfectadoId,
    proveedorId: c.proveedorId,
    conActivoFijo: c.conActivoFijo,
  };
}

/** Las marcas del comprobante: retención, tope, bancarización y quién lo asignó o anuló. */
function marcasDelComprobante(c: FilaDeComprobante['comprobante']) {
  return {
    conRetencion: c.conRetencion,
    montoRetenidoCentavos: aCentavos(c.montoRetenido),
    motivoConRetencion: c.motivoConRetencion,
    sobreElTope: c.sobreElTope,
    motivoSobreElTope: c.motivoSobreElTope,
    sinBancarizar: c.sinBancarizar,
    valeProvisionalId: c.valeProvisionalId,
    destinoDelFaltante: c.destinoDelFaltante,
    asignadoEn: c.asignadoEn?.toISOString() ?? null,
    asignadoPor: c.asignadoPor,
    motivoDeAnulacion: c.motivoDeAnulacion,
  };
}

/** Lo propio del vale de gasto. */
function datosDelVale(c: FilaDeComprobante['comprobante']) {
  return {
    numero: c.numero,
    anioDeNumero: c.anioDeNumero,
    descripcion: c.descripcion,
    pagadoA: c.pagadoA,
    conceptoDeGastoId: c.conceptoDeGastoId,
    motivoSinDocumento: c.motivoSinDocumento,
  };
}

const aDocumento = (documento: NonNullable<FilaDeComprobante['documento']>) => ({
  tipo: documento.tipo,
  serie: documento.serie,
  numero: documento.numero,
  proveedorNombre: documento.nombreEmisor,
  fechaEmision: documento.fechaEmision,
  totalCentavos: aCentavos(documento.total),
  enElLibro: documento.enElLibro,
  motivoFueraDelLibro: documento.motivoFueraDelLibro,
});

/** La fila de la consulta como el comprobante del dominio. */
export function aComprobante({ comprobante, documento, reposicionNumero }: FilaDeComprobante): Comprobante {
  return {
    ...datosDelDocumento(comprobante),
    ...marcasDelComprobante(comprobante),
    ...datosDelVale(comprobante),
    reposicionNumero,
    documento: documento && aDocumento(documento),
  };
}
