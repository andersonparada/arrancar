import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  EstadoDeCuenta,
  HechoDelEstado,
  LineaDelEstado,
  PresentacionDelEstado,
} from '../../servicios/tipos-de-reportes-de-proveedor';
import { esFechaCompleta, primerDiaDelMes } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

/** Lo que se elige en R3; sin proveedor no hay estado de cuenta que pedir. */
export interface FiltrosDeEstadoDeCuenta {
  proveedorId: string;
  desde: string;
  hasta: string;
  mostrarAnulados: boolean;
  presentacion: PresentacionDelEstado;
}

export const OPCIONES_DE_PRESENTACION: { valor: PresentacionDelEstado; texto: string }[] = [
  { valor: 'interna', texto: 'Interna (con total, retenciones y neto)' },
  { valor: 'para_el_proveedor', texto: 'Para el proveedor (retención como abono)' },
];

/** Del primer día del mes a hoy, como lo hace el servidor si no se le dice nada. */
export const filtrosDeEstadoIniciales = (hoy: string, proveedorId = '', hasta = ''): FiltrosDeEstadoDeCuenta => ({
  proveedorId,
  desde: primerDiaDelMes(hasta || hoy),
  hasta: hasta || hoy,
  mostrarAnulados: false,
  presentacion: 'interna',
});

/** Por qué las fechas no sirven, o `undefined`. El tope de meses y el resto de las reglas son del servidor. */
export function errorDelRango(filtros: Pick<FiltrosDeEstadoDeCuenta, 'desde' | 'hasta'>): string | undefined {
  if (!esFechaCompleta(filtros.desde) || !esFechaCompleta(filtros.hasta)) return 'Escriba las dos fechas completas.';
  if (filtros.desde > filtros.hasta) return 'La fecha «Desde» no puede ser posterior a «Hasta».';
  return undefined;
}

/** Se puede pedir con un proveedor y un rango que sirva. */
export const puedePedirElEstado = (filtros: FiltrosDeEstadoDeCuenta): boolean =>
  !!filtros.proveedorId && !errorDelRango(filtros);

export const consultaDeEstadoDeCuenta = (filtros: FiltrosDeEstadoDeCuenta): Consulta => ({
  proveedorId: filtros.proveedorId,
  desde: filtros.desde,
  hasta: filtros.hasta,
  mostrarAnulados: filtros.mostrarAnulados || undefined,
  presentacion: filtros.presentacion === 'interna' ? undefined : filtros.presentacion,
});

/** Cuántos filtros se salen de lo que trae al abrir (para ofrecer «Quitar filtros»). */
export function cantidadDeFiltrosDeEstado(filtros: FiltrosDeEstadoDeCuenta, hoy: string): number {
  const cambios = [
    filtros.desde !== primerDiaDelMes(hoy) || filtros.hasta !== hoy,
    filtros.mostrarAnulados,
    filtros.presentacion !== 'interna',
  ];
  return cambios.filter(Boolean).length;
}

const TEXTOS_DE_HECHO: Record<HechoDelEstado, string> = {
  documento: 'Documento',
  nota_de_credito: 'Nota de crédito',
  pago: 'Pago',
  reintegro: 'Reintegro',
  diferencia_menor: 'Diferencia menor',
  baja_de_saldo_a_favor: 'Baja de saldo a favor',
  anulacion_de_documento: 'Anulación de documento',
  anulacion_de_pago: 'Anulación de pago',
  anulacion_de_reintegro: 'Anulación de reintegro',
  anulacion_de_ajuste: 'Anulación de ajuste',
  retencion: 'Retención',
};

export const textoDeHecho = (hecho: HechoDelEstado): string => TEXTOS_DE_HECHO[hecho];

/** Una línea anulada dentro del rango sale tachada y sin saldo; lo dice también con palabras. */
export const textoDeLinea = (linea: LineaDelEstado): string =>
  linea.anulada ? `${linea.concepto} (anulada)` : linea.concepto;

/** Las líneas de R3 que llevan a una ficha (un documento o una nota). */
export const tieneFicha = (linea: LineaDelEstado): boolean => linea.documentoId !== null;

/** Un monto de una columna del estado: vacío si en esa línea no hay nada. */
export const montoOVacio = (monto: string | null): string => (monto === null ? '' : formatearMonto(monto));

/** Lo pagado o rebajado de un saldo inicial antes de la fecha de inicio. */
export const notaDeAnteriores = (linea: LineaDelEstado): string | null =>
  linea.anterioresAlInicio === null
    ? null
    : `Anteriores a la fecha de inicio de la empresa: ${formatearMonto(linea.anterioresAlInicio)}`;

/** Las cifras de arriba de R3; la presentación interna agrega lo comprometido y lo disponible. */
export function totalesDeEstado({ totales, alCorte }: EstadoDeCuenta): TotalDelReporte[] {
  const base: TotalDelReporte[] = [
    { etiqueta: 'Saldo final', valor: formatearMonto(totales.saldoFinal), destacado: true },
    { etiqueta: 'Saldo anterior', valor: formatearMonto(totales.saldoAnterior) },
    { etiqueta: 'Cargos del período', valor: formatearMonto(totales.cargos) },
    { etiqueta: 'Abonos del período', valor: formatearMonto(totales.abonos) },
  ];
  if (!alCorte) return base;
  return [
    ...base,
    { etiqueta: 'Comprometido (posfechados)', valor: formatearMonto(alCorte.comprometido) },
    { etiqueta: 'Disponible para pagar', valor: formatearMonto(alCorte.disponible) },
  ];
}

/** Lo que se dice cuando el rango no tiene movimientos: el saldo no cambió. */
export const textoSinMovimientos = ({ totales }: EstadoDeCuenta): string =>
  `No hubo movimientos en este período; el saldo se mantuvo en ${formatearMonto(totales.saldoFinal)}.`;

/** Las líneas del encabezado impreso del estado de cuenta. */
export function lineasDeImpresionDeEstado(estado: EstadoDeCuenta): string[] {
  const nit = estado.proveedor.nit ? ` · NIT ${estado.proveedor.nit}` : '';
  return [
    `Proveedor: ${estado.proveedor.nombre}${nit}`,
    `Del ${formatearFecha(estado.desde)} al ${formatearFecha(estado.hasta)}`,
    estado.presentacion === 'interna' ? 'Presentación interna' : 'Estado de cuenta para el proveedor',
  ];
}
