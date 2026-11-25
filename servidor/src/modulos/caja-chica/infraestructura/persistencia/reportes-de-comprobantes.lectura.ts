import { and, asc, eq, gt, gte, inArray, isNotNull, isNull, lte, ne, notExists, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type {
  ComprobanteDeReporte,
  FiltroAlCorte,
  FiltroDePeriodo,
} from '../../aplicacion/puertos/puertos-de-reportes.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { conceptoDeAjuste, conceptoDeLasLineas, SIN_CONCEPTO } from '../../dominio/reglas-de-reportes.js';
import { aComprobante, comprobantesConSuContexto, type FilaDeComprobante } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { fondos } from './fondos.tablas.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/** Los nombres de los conceptos de las líneas de cada documento, en el orden de sus líneas. */
async function conceptosDeDocumentos(ids: readonly string[]): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const filas = await transaccionEnCurso()
    .select({ documentoId: lineasDeDocumento.documentoId, nombre: conceptosDeGasto.nombre })
    .from(lineasDeDocumento)
    .innerJoin(conceptosDeGasto, eq(conceptosDeGasto.id, lineasDeDocumento.conceptoId))
    .where(inArray(lineasDeDocumento.documentoId, [...ids]))
    .orderBy(asc(lineasDeDocumento.numero));
  const nombres = new Map<string, string[]>();
  for (const { documentoId, nombre } of filas) nombres.set(documentoId, [...(nombres.get(documentoId) ?? []), nombre]);
  return nombres;
}

/** Los nombres de los conceptos de gasto por id (los de los vales de gasto). */
async function nombresDeConceptos(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const filas = await transaccionEnCurso()
    .select({ id: conceptosDeGasto.id, nombre: conceptosDeGasto.nombre })
    .from(conceptosDeGasto)
    .where(inArray(conceptosDeGasto.id, [...ids]));
  return new Map(filas.map(({ id, nombre }) => [id, nombre]));
}

/** Los nombres de los fondos por id. */
export async function nombresDeFondos(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const filas = await transaccionEnCurso()
    .select({ id: fondos.id, nombre: fondos.nombre })
    .from(fondos)
    .where(inArray(fondos.id, [...ids]));
  return new Map(filas.map(({ id, nombre }) => [id, nombre]));
}

const sinNulos = (valores: readonly (string | null)[]): string[] => valores.filter((valor) => valor !== null);

interface FuentesDeConceptos {
  deDocumentos: Map<string, string[]>;
  deVales: Map<string, string>;
}

/** El concepto de un comprobante: el del ajuste, el de su vale de gasto o el de las líneas de su documento. */
function conceptoDe(comprobante: Comprobante, { deDocumentos, deVales }: FuentesDeConceptos): string {
  const ajuste = conceptoDeAjuste(comprobante.clase);
  if (ajuste) return ajuste;
  if (comprobante.conceptoDeGastoId) return deVales.get(comprobante.conceptoDeGastoId) ?? SIN_CONCEPTO;
  return conceptoDeLasLineas(deDocumentos.get(comprobante.documentoDeCompraId ?? '') ?? []);
}

/** A cada comprobante le suma el nombre de su fondo y su concepto de gasto. */
export async function conFondoYConcepto(filas: readonly FilaDeComprobante[]): Promise<ComprobanteDeReporte[]> {
  const lista = filas.map(aComprobante);
  const [deDocumentos, deVales, deFondos] = await Promise.all([
    conceptosDeDocumentos(sinNulos(lista.map(({ documentoDeCompraId }) => documentoDeCompraId))),
    nombresDeConceptos(sinNulos(lista.map(({ conceptoDeGastoId }) => conceptoDeGastoId))),
    nombresDeFondos(sinNulos(lista.map(({ fondoId }) => fondoId))),
  ]);
  return lista.map((comprobante) => ({
    comprobante,
    fondoNombre: deFondos.get(comprobante.fondoId ?? '') ?? '',
    concepto: conceptoDe(comprobante, { deDocumentos, deVales }),
  }));
}

/** Lo que cubre una reposición vigente al corte: ya con fecha y no anulada ese día. */
export function cubiertoAlCorte(corte: string): SQL {
  const linea = alias(reposicionComprobantes, 'linea_al_corte');
  const reposicion = alias(reposiciones, 'reposicion_al_corte');
  const yaRepuesto = transaccionEnCurso()
    .select({ uno: sql`1` })
    .from(linea)
    .innerJoin(reposicion, eq(reposicion.id, linea.reposicionId))
    .where(
      and(
        eq(linea.comprobanteId, comprobantes.id),
        lte(reposicion.fecha, corte),
        or(eq(reposicion.estado, 'vigente'), gt(reposicion.fechaDeAnulacion, corte)),
      ),
    );
  return notExists(yaRepuesto);
}

/** CC-R1: asignados a un fondo, de la fecha al corte, vigentes ese día y sin reposición vigente ese día. */
export async function pendientesAlCorteDe({ corte, fondoId }: FiltroAlCorte): Promise<ComprobanteDeReporte[]> {
  const filas = await comprobantesConSuContexto()
    .where(
      and(
        isNotNull(comprobantes.fondoId),
        fondoId ? eq(comprobantes.fondoId, fondoId) : undefined,
        lte(comprobantes.fecha, corte),
        or(eq(comprobantes.estado, 'vigente'), gt(comprobantes.fechaDeAnulacion, corte)),
        cubiertoAlCorte(corte),
      ),
    )
    .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
  return conFondoYConcepto(filas);
}

/** El emisor anuló la FEL y no hay otra que la reemplace: el gasto no tiene documento fiscal. */
const sinDocumentoVigente = and(
  isNotNull(comprobantes.motivoDocumentoAnulado),
  or(isNull(comprobantes.salidaDelDocumento), ne(comprobantes.salidaDelDocumento, 'reemplazo')),
);

/** CC-R3: vales de gasto y documentos fuera del libro, vigentes y de la fecha del período. */
export async function sinDocumentoFiscalDe({
  desde,
  hasta,
  fondoId,
}: FiltroDePeriodo): Promise<ComprobanteDeReporte[]> {
  const filas = await comprobantesConSuContexto()
    .where(
      and(
        isNotNull(comprobantes.fondoId),
        fondoId ? eq(comprobantes.fondoId, fondoId) : undefined,
        eq(comprobantes.estado, 'vigente'),
        gte(comprobantes.fecha, desde),
        lte(comprobantes.fecha, hasta),
        or(
          eq(comprobantes.clase, 'vale_de_gasto'),
          and(eq(comprobantes.clase, 'documento'), or(eq(documentos.muestraEnReportesSat, false), sinDocumentoVigente)),
        ),
      ),
    )
    .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
  return conFondoYConcepto(filas);
}
