import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EfectoFiscal } from '../../../dominio/bancarizacion-de-pagos.js';
import {
  marcasDelCargo,
  NOTA_DE_IVA_NO_CONOCIDO,
  type MarcasDelCargo,
} from '../../../dominio/marcas-de-bancarizacion.js';
import type {
  CargoDeBancarizacionDto,
  MesDeBancarizacionDto,
  PagoEnEfectivoDto,
} from '../../dto/reportes-de-bancarizacion.dto.js';
import type {
  CargoDeBancarizacion,
  PagoEnEfectivoDelRango,
} from '../../puertos/puertos-de-bancarizacion-del-reporte.js';

export type EfectosPorCargo = ReadonlyMap<string, EfectoFiscal>;

/** Un cargo con lo que se le marcó. */
export interface CargoMarcado {
  cargo: CargoDeBancarizacion;
  marcas: MarcasDelCargo;
}

/** Un pago en efectivo con los cargos que salen en el reporte. */
export interface PagoMarcado {
  pago: PagoEnEfectivoDelRango;
  cargos: CargoMarcado[];
}

/** La clave de un proveedor y un mes `AAAA-MM`. */
export const claveDeProveedorYMes = (proveedorId: string, fecha: string): string =>
  `${proveedorId}|${fecha.slice(0, 7)}`;

export function marcar(cargo: CargoDeBancarizacion, efectos: EfectosPorCargo): CargoMarcado {
  return { cargo, marcas: marcasDelCargo({ ...cargo, efecto: efectos.get(cargo.documentoId) ?? null }) };
}

export function dtoDeCargo({ cargo, marcas }: CargoMarcado): CargoDeBancarizacionDto {
  return {
    documentoId: cargo.documentoId,
    documento: cargo.etiqueta,
    marcas: [...marcas.marcas, ...(marcas.ivaNoConocido ? [NOTA_DE_IVA_NO_CONOCIDO] : [])],
    ivaEnRiesgo: deCentavos(marcas.ivaEnRiesgoCentavos),
    costoNoDeducible: deCentavos(marcas.costoNoDeducibleCentavos),
    ivaNoConocido: marcas.ivaNoConocido,
  };
}

/** Lo que suman los cargos, cada uno una sola vez. */
export function sumarCargos(marcados: readonly CargoMarcado[]): { ivaCentavos: number; costoCentavos: number } {
  const unicos = new Map(marcados.map((marcado) => [marcado.cargo.documentoId, marcado]));
  let ivaCentavos = 0;
  let costoCentavos = 0;
  for (const { marcas } of unicos.values()) {
    ivaCentavos += marcas.ivaEnRiesgoCentavos;
    costoCentavos += marcas.costoNoDeducibleCentavos;
  }
  return { ivaCentavos, costoCentavos };
}

const tieneMarcas = ({ marcas }: CargoMarcado): boolean => marcas.marcas.length > 0;

/**
 * Los pagos en efectivo con sus cargos marcados. Con `soloConEfecto`, solo los pagos con algún cargo con efecto fiscal y, de
 * cada uno, esos cargos.
 */
export function marcarPagos(
  pagos: readonly PagoEnEfectivoDelRango[],
  efectos: EfectosPorCargo,
  soloConEfecto: boolean,
): PagoMarcado[] {
  const marcados = pagos.map((pago) => ({ pago, cargos: pago.cargos.map((cargo) => marcar(cargo, efectos)) }));
  if (!soloConEfecto) return marcados;
  return marcados
    .map(({ pago, cargos }) => ({ pago, cargos: cargos.filter(tieneMarcas) }))
    .filter(({ cargos }) => cargos.length > 0);
}

function dtoDePago({ pago, cargos }: PagoMarcado): PagoEnEfectivoDto {
  return {
    pagoId: pago.pagoId,
    recibo: pago.recibo,
    fecha: pago.fecha,
    retiro: pago.retiro,
    monto: deCentavos(pago.montoCentavos),
    sinBancarizar: pago.motivoSinBancarizar !== null,
    motivoSinBancarizar: pago.motivoSinBancarizar,
    cargos: cargos.map(dtoDeCargo),
  };
}

function mesDe(clave: string, grupo: readonly PagoMarcado[], sumaCentavos: number): MesDeBancarizacionDto {
  const { pago } = grupo[0]!;
  const { ivaCentavos, costoCentavos } = sumarCargos(grupo.flatMap(({ cargos }) => cargos));
  return {
    proveedorId: pago.proveedorId,
    proveedorNombre: pago.proveedorNombre,
    mes: clave.split('|')[1]!,
    sumaDelMes: deCentavos(sumaCentavos),
    efectivo: deCentavos(grupo.reduce((total, { pago: p }) => total + p.montoCentavos, 0)),
    ivaEnRiesgo: deCentavos(ivaCentavos),
    costoNoDeducible: deCentavos(costoCentavos),
    pagos: grupo.map(dtoDePago),
  };
}

/** Los meses armados y los cargos marcados de todos sus pagos (para sumar la sección sin repetir). */
export interface MesesArmados {
  meses: MesDeBancarizacionDto[];
  cargos: CargoMarcado[];
}

/** Los meses de cada proveedor: los que tienen una suma (los que llegan al umbral) y pagos en efectivo, por mes y nombre. */
export function armarMeses(pagos: readonly PagoMarcado[], sumas: ReadonlyMap<string, number>): MesesArmados {
  const grupos = new Map<string, PagoMarcado[]>();
  for (const pago of pagos) {
    const clave = claveDeProveedorYMes(pago.pago.proveedorId, pago.pago.fecha);
    if (sumas.has(clave)) grupos.set(clave, [...(grupos.get(clave) ?? []), pago]);
  }
  const meses = [...grupos.entries()]
    .map(([clave, grupo]) => mesDe(clave, grupo, sumas.get(clave)!))
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.proveedorNombre.localeCompare(b.proveedorNombre));
  return { meses, cargos: [...grupos.values()].flat().flatMap(({ cargos }) => cargos) };
}
