import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { porcentajeDelTramo, tramoDeAntiguedad, type TramoDeAntiguedad } from '../../dominio/saldo-al-corte.js';
import { cifrasEnCero, sumarCifras, type CifrasDeSaldo, type SaldoDeNit } from '../../dominio/saldos-por-nit.js';
import type { FilaDeDocumentoAlCorte, TotalesDeDocumentosAlCorte } from '../puertos/puertos-de-saldos-al-corte.js';
import type {
  CifrasDeSaldoDto,
  FilaDeDocumentoAlCorteDto,
  FilaDeSaldoDto,
  TotalesDeDocumentosAlCorteDto,
  TotalesDeSaldosDto,
  TramosDto,
} from './saldos-al-corte.dto.js';

/** Los seis tramos como texto, cada uno según `convertir` (el monto o su porcentaje). */
function tramosDto(tramos: Record<TramoDeAntiguedad, number>, convertir: (centavos: number) => string): TramosDto {
  return {
    porVencer: convertir(tramos.por_vencer),
    de1a30: convertir(tramos.de_1_a_30),
    de31a60: convertir(tramos.de_31_a_60),
    de61a90: convertir(tramos.de_61_a_90),
    masDe90: convertir(tramos.mas_de_90),
    sinVencimiento: convertir(tramos.sin_vencimiento),
  };
}

/**
 * Las cifras para la API. En los deudores el neto va en positivo. Lo disponible para pagar es, como en la ficha del
 * proveedor y también en los deudores, la deuda de los cargos menos lo comprometido: lo que está a favor no resta aquí.
 */
export function cifrasDto(cifras: CifrasDeSaldo, esDeudor: boolean): CifrasDeSaldoDto {
  return {
    ...tramosDto(cifras.tramos, deCentavos),
    totalCargos: deCentavos(cifras.totalCargos),
    saldosAFavor: deCentavos(cifras.saldosAFavor),
    saldoNeto: deCentavos(esDeudor ? -cifras.neto : cifras.neto),
    comprometido: deCentavos(cifras.comprometido),
    disponible: deCentavos(cifras.totalCargos - cifras.comprometido),
    sinAutorizar: deCentavos(cifras.sinAutorizar),
  };
}

/** Una fila de R1; si el NIT está en varias fichas, cada una va como subrenglón. */
export function filaDeSaldoDto(grupo: SaldoDeNit, esDeudor: boolean): FilaDeSaldoDto {
  const fila: FilaDeSaldoDto = {
    nit: grupo.nit,
    nombre: grupo.nombre,
    proveedorId: grupo.proveedorId,
    ...cifrasDto(grupo, esDeudor),
  };
  if (grupo.fichas.length <= 1) return fila;
  return {
    ...fila,
    fichas: grupo.fichas.map((ficha) =>
      filaDeSaldoDto({ ...ficha, nit: grupo.nit, proveedorId: ficha.proveedorId, fichas: [ficha] }, esDeudor),
    ),
  };
}

const sumaDe = (grupos: readonly SaldoDeNit[]): CifrasDeSaldo =>
  grupos.reduce<CifrasDeSaldo>((suma, grupo) => sumarCifras(suma, grupo), cifrasEnCero());

/** Los totales de los dos bloques, el saldo neto de Proveedores y el porcentaje de cada tramo sobre el total de cargos. */
export function totalesDeSaldosDto(
  acreedores: readonly SaldoDeNit[],
  deudores: readonly SaldoDeNit[],
): TotalesDeSaldosDto {
  const delAcreedor = sumaDe(acreedores);
  const delDeudor = sumaDe(deudores);
  const todo = sumarCifras(delAcreedor, delDeudor);
  return {
    acreedores: cifrasDto(delAcreedor, false),
    deudores: cifrasDto(delDeudor, true),
    saldoNeto: deCentavos(todo.neto),
    cargosPorTramo: tramosDto(todo.tramos, deCentavos),
    porcentajesPorTramo: tramosDto(todo.tramos, (centavos) => porcentajeDelTramo(centavos, todo.totalCargos)),
    totalCargos: deCentavos(todo.totalCargos),
  };
}

/** Quién y qué documento es, y cuándo vence: lo que no es dinero en una fila de R2. */
function datosDelDocumentoDto(fila: FilaDeDocumentoAlCorte, corte: string) {
  return {
    id: fila.id,
    proveedorId: fila.proveedorId,
    proveedorNombre: fila.proveedorNombre,
    proveedorNit: fila.proveedorNit,
    tipo: fila.tipo,
    origen: fila.origen,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    vencimiento: fila.vencimiento,
    diasVencido: fila.diasVencido,
    tramo: tramoDeAntiguedad(corte, fila.vencimiento),
    estadoDePago: fila.estadoDePago,
    autorizado: fila.autorizado,
    contrasena: fila.contrasena,
  };
}

/** Los montos de una fila de R2 como texto; los que no aplican a un cargo del libro van en `null`. */
function montosDelDocumentoDto(fila: FilaDeDocumentoAlCorte) {
  const dinero = (centavos: number | null) => (centavos === null ? null : deCentavos(centavos));
  return {
    total: deCentavos(fila.totalCentavos),
    retenciones: deCentavos(fila.retencionesCentavos),
    neto: deCentavos(fila.netoCentavos),
    anterioresAlInicio: dinero(fila.anterioresAlInicioCentavos),
    notasAplicadas: deCentavos(fila.aplicadoCentavos),
    pagado: deCentavos(fila.pagadoCentavos),
    ajustado: deCentavos(fila.ajustadoCentavos),
    saldo: deCentavos(fila.saldoCentavos),
    comprometido: deCentavos(fila.comprometidoCentavos),
    disponible: deCentavos(fila.saldoCentavos - fila.comprometidoCentavos),
    retencionesPorPracticar: dinero(fila.retencionesPorPracticarCentavos),
  };
}

/** Una fila de R2 para la API, con su tramo por «Vence» al corte. */
export function filaDeDocumentoDto(fila: FilaDeDocumentoAlCorte, corte: string): FilaDeDocumentoAlCorteDto {
  return { ...datosDelDocumentoDto(fila, corte), ...montosDelDocumentoDto(fila) };
}

export function totalesDeDocumentosDto(totales: TotalesDeDocumentosAlCorte): TotalesDeDocumentosAlCorteDto {
  return {
    total: deCentavos(totales.totalCentavos),
    retenciones: deCentavos(totales.retencionesCentavos),
    pagado: deCentavos(totales.pagadoCentavos),
    saldo: deCentavos(totales.saldoCentavos),
    comprometido: deCentavos(totales.comprometidoCentavos),
    disponible: deCentavos(totales.saldoCentavos - totales.comprometidoCentavos),
  };
}
