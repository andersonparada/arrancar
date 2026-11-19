import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { esDeducible, firmadoDelComprobante, motivoSinDocumentoFiscal } from '../../../dominio/reglas-de-reportes.js';
import type { FilaDeComprobanteDto, GrupoDeFondoDto, TotalDeComprobantesDto } from '../../dto/reportes.dto.js';
import type { ComprobanteDeReporte } from '../../puertos/puertos-de-reportes.js';

/** Cómo se nombra el comprobante en un reporte: «FACT A-12», «Vale 5», «Faltante de arqueo». */
export function nombreDelDocumento({ documento, clase, numero }: Comprobante): string {
  if (documento) return `${documento.tipo} ${documento.serie ? `${documento.serie}-` : ''}${documento.numero}`;
  if (clase === 'vale_de_gasto') return `Vale ${numero}`;
  return clase === 'faltante' ? 'Faltante de arqueo' : 'Sobrante de arqueo';
}

/** La fila de un comprobante; `conMotivo` agrega por qué no tiene documento fiscal (CC-R3). */
export function filaDeComprobante(
  { comprobante, concepto }: ComprobanteDeReporte,
  conMotivo: boolean,
): FilaDeComprobanteDto {
  return {
    id: comprobante.id,
    clase: comprobante.clase,
    documento: nombreDelDocumento(comprobante),
    proveedor: comprobante.documento?.proveedorNombre ?? comprobante.pagadoA ?? '',
    fecha: comprobante.fecha,
    concepto,
    deducible: esDeducible(comprobante),
    monto: deCentavos(firmadoDelComprobante(comprobante)),
    motivo: conMotivo ? motivoSinDocumentoFiscal(comprobante) : null,
  };
}

const sumar = (elementos: readonly ComprobanteDeReporte[], deducible: boolean | null): number =>
  elementos
    .filter(({ comprobante }) => deducible === null || esDeducible(comprobante) === deducible)
    .reduce((suma, { comprobante }) => suma + firmadoDelComprobante(comprobante), 0);

/** Las cifras de una lista de comprobantes: lo deducible, lo no deducible y el total. */
export function totalDe(elementos: readonly ComprobanteDeReporte[]): TotalDeComprobantesDto {
  return {
    cantidad: elementos.length,
    deducible: deCentavos(sumar(elementos, true)),
    noDeducible: deCentavos(sumar(elementos, false)),
    total: deCentavos(sumar(elementos, null)),
  };
}

/** Los comprobantes agrupados por fondo, los fondos por nombre y cada fondo con sus filas en el orden recibido. */
export function agruparPorFondo(elementos: readonly ComprobanteDeReporte[], conMotivo: boolean): GrupoDeFondoDto[] {
  const porFondo = new Map<string, ComprobanteDeReporte[]>();
  for (const elemento of elementos) {
    const fondoId = elemento.comprobante.fondoId ?? '';
    porFondo.set(fondoId, [...(porFondo.get(fondoId) ?? []), elemento]);
  }
  return [...porFondo.entries()]
    .map(([fondoId, grupo]) => ({
      fondoId,
      fondoNombre: grupo[0]!.fondoNombre,
      ...totalDe(grupo),
      filas: grupo.map((elemento) => filaDeComprobante(elemento, conMotivo)),
    }))
    .sort((a, b) => a.fondoNombre.localeCompare(b.fondoNombre, 'es'));
}
