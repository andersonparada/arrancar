import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { desglosarLaReposicion, totalDeLaReposicion } from '../../../dominio/desglose-de-reposicion.js';
import type { LineaDeReposicionEmitida } from '../../../dominio/eventos-de-reposiciones.js';
import { efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import type {
  ComprobanteParaDesglosar,
  DesgloseDeReposicion,
  LineaDeReposicion,
  Reposicion,
} from '../../../dominio/reposiciones.js';
import type { DesgloseDeReposicionDto, ReposicionDto, ReposicionResumenDto } from '../../dto/reposiciones.dto.js';
import { comprobanteDto } from '../comprobantes/armado-del-comprobante.js';
import type { LibroParaReponer } from '../../puertos/puertos-de-reposiciones.js';

/** Un comprobante con lo que aporta a la reposición, firmado: lo que resta (nota de crédito, sobrante) va negativo. */
export interface ComprobanteFirmado {
  comprobante: Comprobante;
  firmadoCentavos: number;
}

/** Lo que cada comprobante aporta si se repone hoy. */
export const firmadosDe = (comprobantes: readonly Comprobante[]): ComprobanteFirmado[] =>
  comprobantes.map((comprobante) => ({ comprobante, firmadoCentavos: efectoEnLoPendiente(comprobante) }));

/** Une las líneas guardadas con sus comprobantes (el monto firmado es el copiado al reponer). */
export function firmadosDeLasLineas(
  lineas: readonly LineaDeReposicion[],
  comprobantes: readonly Comprobante[],
): ComprobanteFirmado[] {
  const porId = new Map(comprobantes.map((comprobante) => [comprobante.id, comprobante]));
  return lineas.flatMap(({ comprobanteId, montoCentavos }) => {
    const comprobante = porId.get(comprobanteId);
    return comprobante ? [{ comprobante, firmadoCentavos: montoCentavos }] : [];
  });
}

const paraDesglosar = ({ comprobante, firmadoCentavos }: ComprobanteFirmado): ComprobanteParaDesglosar => ({
  clase: comprobante.clase,
  conActivoFijo: comprobante.conActivoFijo,
  firmadoCentavos,
});

/** Lo que se repone: la suma firmada. */
export const totalDe = (firmados: readonly ComprobanteFirmado[]): number =>
  totalDeLaReposicion(firmados.map(paraDesglosar));

/** El desglose por concepto de Bancos de estos comprobantes. */
export const desgloseDe = (firmados: readonly ComprobanteFirmado[]): DesgloseDeReposicion =>
  desglosarLaReposicion(firmados.map(paraDesglosar));

export const desgloseDto = (desglose: DesgloseDeReposicion): DesgloseDeReposicionDto => ({
  operacion: deCentavos(desglose.operacionCentavos),
  activo: deCentavos(desglose.activoCentavos),
  faltante: deCentavos(desglose.faltanteCentavos),
});

/** La reposición para las listas. */
export const resumenDeLaReposicion = (reposicion: Reposicion): ReposicionResumenDto => ({
  id: reposicion.id,
  fondoId: reposicion.fondoId,
  numero: reposicion.numero,
  fecha: reposicion.fecha,
  forma: reposicion.forma,
  monto: deCentavos(reposicion.montoCentavos),
  movimientoId: reposicion.movimientoId,
  custodio: reposicion.custodio,
  laHizoElCustodio: reposicion.laHizoElCustodio,
  estado: reposicion.estado,
  fechaDeAnulacion: reposicion.fechaDeAnulacion,
  motivoDeAnulacion: reposicion.motivoDeAnulacion,
});

/** La reposición completa; también es lo que queda en la auditoría como «anterior». */
export function reposicionDto(por: {
  reposicion: Reposicion;
  firmados: readonly ComprobanteFirmado[];
  avisos?: readonly string[];
}): ReposicionDto {
  const { reposicion, firmados, avisos = [] } = por;
  return {
    ...resumenDeLaReposicion(reposicion),
    desglose: desgloseDto(desgloseDe(firmados)),
    lineas: firmados.map(({ comprobante, firmadoCentavos }) => ({
      comprobante: comprobanteDto(comprobante),
      monto: deCentavos(firmadoCentavos),
    })),
    avisos: [...avisos],
  };
}

/** Las líneas de los eventos: cada comprobante con su documento, concepto, activo fijo y si es deducible. */
export const lineasEmitidas = (firmados: readonly ComprobanteFirmado[]): LineaDeReposicionEmitida[] =>
  firmados.map(({ comprobante, firmadoCentavos }) => ({
    comprobanteId: comprobante.id,
    clase: comprobante.clase,
    documentoDeCompraId: comprobante.documentoDeCompraId,
    conceptoDeGastoId: comprobante.conceptoDeGastoId,
    montoCentavos: firmadoCentavos,
    conActivoFijo: comprobante.conActivoFijo,
    deducible: comprobante.documento?.enElLibro ?? false,
  }));

/**
 * Marca como procesados los documentos del libro de lo que se repone. Los que el emisor ya anuló (comprobante «documento
 * anulado, por resolver») se saltan: el libro no marca uno anulado y el efectivo se repone igual.
 */
export async function marcarProcesadosEnElLibro(
  libro: LibroParaReponer,
  operador: Operador,
  firmados: readonly ComprobanteFirmado[],
): Promise<void> {
  for (const { comprobante } of firmados) {
    if (comprobante.documentoDeCompraId === null || comprobante.motivoDocumentoAnulado !== null) continue;
    await libro.marcarProcesado(operador, comprobante.documentoDeCompraId, true);
  }
}
