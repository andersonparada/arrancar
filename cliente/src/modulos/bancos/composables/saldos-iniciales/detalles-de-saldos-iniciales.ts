import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type {
  HallazgoDeCierre,
  ResumenDeSaldoInicial,
  SaldosIniciales,
} from '../../servicios/tipos-de-saldos-iniciales';
import {
  AYUDA_DE_CARGA_CERRADA,
  CARGA_ABIERTA,
  CARGA_CERRADA,
  CUENTA_SIN_SALDO,
  ETIQUETA_DE_LIBROS_ANTERIORES,
  SIN_FECHA_DE_INICIO,
} from '../../textos-de-apertura';
import { textoDeLaDiferencia } from './cuadre-de-saldo-inicial';

type Fechas = Pick<SaldosIniciales, 'fechaDeInicio' | 'cargaCerrada'>;

/** Se puede cargar (agregar, corregir, importar) solo con fecha de inicio y la carga abierta; el servidor valida igual. */
export const sePuedeCargar = (saldos: Fechas | null): boolean =>
  saldos !== null && saldos.fechaDeInicio !== null && !saldos.cargaCerrada;

/** El Excel de la administración: exportar siempre; importar solo mientras se pueda cargar. */
export const permisosDeIntercambio = (puedeCargar: boolean): { importar?: string; exportar: string } => ({
  exportar: 'bancos.saldos-iniciales.exportar',
  ...(puedeCargar ? { importar: 'bancos.saldos-iniciales.importar' } : {}),
});

export interface SituacionDeLaApertura {
  situacion: 'sin_fecha' | 'abierta' | 'cerrada';
  texto: string;
  ayuda: string | null;
}

/** Lo que dice el aviso de arriba de la pantalla sobre la carga inicial. */
export function situacionDeLaApertura(saldos: Fechas): SituacionDeLaApertura {
  if (saldos.fechaDeInicio === null) return { situacion: 'sin_fecha', texto: SIN_FECHA_DE_INICIO, ayuda: null };
  if (saldos.cargaCerrada) return { situacion: 'cerrada', texto: CARGA_CERRADA, ayuda: AYUDA_DE_CARGA_CERRADA };
  return { situacion: 'abierta', texto: CARGA_ABIERTA, ayuda: null };
}

/** Las cuentas por nombre (la lista del servidor no promete un orden). */
export const ordenarCuentasPorNombre = (cuentas: readonly ResumenDeSaldoInicial[]): ResumenDeSaldoInicial[] =>
  [...cuentas].sort((a, b) => a.cuentaNombre.localeCompare(b.cuentaNombre, 'es'));

const formatearOMontoNulo = (monto: string | null): string | null => (monto === null ? null : formatearMonto(monto));

/** Lo que muestra la tarjeta de una cuenta; sin saldo inicial, solo lo que hay que hacer. */
export function detallesDeLaCuenta(cuenta: ResumenDeSaldoInicial): DetalleDeRegistro[] {
  if (cuenta.forma === 'sin_saldo') return [{ etiqueta: 'Estado', valor: CUENTA_SIN_SALDO }];
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Saldo según el estado de cuenta', valor: formatearMonto(cuenta.saldoSegunEstadoDeCuenta) },
    {
      etiqueta: ETIQUETA_DE_LIBROS_ANTERIORES,
      valor: formatearTexto(formatearOMontoNulo(cuenta.saldoSegunLibrosAnteriores)),
    },
  ];
  if (cuenta.diferencia !== null) {
    detalles.push({
      etiqueta: 'Diferencia',
      valor: `${formatearMonto(cuenta.diferencia)}. ${textoDeLaDiferencia(cuenta.diferencia)}`,
    });
  }
  return detalles;
}

export interface HallazgosAgrupados {
  /** Piden motivo para cerrar la carga (rojo). */
  conMotivo: HallazgoDeCierre[];
  /** Solo avisan (ámbar). */
  avisos: HallazgoDeCierre[];
}

export const agruparHallazgos = (hallazgos: readonly HallazgoDeCierre[]): HallazgosAgrupados => ({
  conMotivo: hallazgos.filter((hallazgo) => hallazgo.pideMotivo),
  avisos: hallazgos.filter((hallazgo) => !hallazgo.pideMotivo),
});

/** La fecha de corte para decirla en un texto; sin fecha de inicio no hay corte. */
export const textoDeLaFechaDeCorte = (corte: string | null): string => (corte === null ? '' : formatearFecha(corte));
