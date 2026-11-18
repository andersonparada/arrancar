import { aCentavos } from './centavos.js';

/** Lo que Bancos le dice a quien va a cerrar la carga inicial (docs/modulos/diseno-bancos-segunda-parte.md §5.6). */
export type CodigoDeHallazgo =
  'no_cuadra' | 'sin_dato_de_libros' | 'sin_evidencia' | 'saldo_global' | 'sobregiro_sin_permiso';

export interface HallazgoDeCierre {
  cuentaBancariaId: string;
  cuentaNombre: string;
  codigo: CodigoDeHallazgo;
  mensaje: string;
  /** Cerrar la carga con este hallazgo pide un motivo (y queda en la auditoría). */
  pideMotivo: boolean;
}

/** Lo que la revisión necesita de una cuenta con saldo inicial. */
export interface CuentaParaLaRevision {
  cuentaBancariaId: string;
  cuentaNombre: string;
  forma: 'sin_saldo' | 'con_partidas' | 'global';
  saldoEnLibrosAlCorte: string;
  saldoSegunLibrosAnteriores: string | null;
  diferencia: string | null;
  tieneEvidencia: boolean;
}

type Dato = Pick<HallazgoDeCierre, 'codigo' | 'mensaje'> & { pideMotivo?: boolean };

const hallazgo = (cuenta: CuentaParaLaRevision, { codigo, mensaje, pideMotivo = false }: Dato): HallazgoDeCierre => ({
  cuentaBancariaId: cuenta.cuentaBancariaId,
  cuentaNombre: cuenta.cuentaNombre,
  codigo,
  mensaje: `${cuenta.cuentaNombre}: ${mensaje}`,
  pideMotivo,
});

/** Sin el dato de los libros anteriores no hay con qué comparar; con él, una diferencia pide motivo. */
function hallazgosDeLosLibros(cuenta: CuentaParaLaRevision): HallazgoDeCierre[] {
  if (cuenta.saldoSegunLibrosAnteriores === null) {
    const mensaje = 'falta el saldo de la cuenta contable en los libros anteriores para comparar.';
    return [hallazgo(cuenta, { codigo: 'sin_dato_de_libros', mensaje, pideMotivo: true })];
  }
  if (cuenta.diferencia === null || aCentavos(cuenta.diferencia) === 0) return [];
  const mensaje = `el saldo en libros al corte difiere de los libros anteriores en ${cuenta.diferencia}.`;
  return [hallazgo(cuenta, { codigo: 'no_cuadra', mensaje, pideMotivo: true })];
}

function hallazgosDeLaCuentaConPartidas(cuenta: CuentaParaLaRevision): HallazgoDeCierre[] {
  const sinEvidencia = {
    codigo: 'sin_evidencia' as const,
    mensaje: 'no tiene adjunto el estado de cuenta ni la conciliación anteriores.',
  };
  return [...hallazgosDeLosLibros(cuenta), ...(cuenta.tieneEvidencia ? [] : [hallazgo(cuenta, sinEvidencia)])];
}

function hallazgosDeLaCuenta(cuenta: CuentaParaLaRevision, permiteSobregiro: boolean): HallazgoDeCierre[] {
  const global = { codigo: 'saldo_global' as const, mensaje: 'sigue con el saldo «de antes», sin partidas.' };
  const sobregiro = {
    codigo: 'sobregiro_sin_permiso' as const,
    mensaje: 'el saldo al corte es negativo y la empresa no permite sobregiro.',
  };
  return [
    ...(cuenta.forma === 'global' ? [hallazgo(cuenta, global)] : hallazgosDeLaCuentaConPartidas(cuenta)),
    ...(aCentavos(cuenta.saldoEnLibrosAlCorte) < 0 && !permiteSobregiro ? [hallazgo(cuenta, sobregiro)] : []),
  ];
}

/**
 * Los hallazgos de las cuentas con saldo inicial: no cuadra y sin dato de libros piden motivo; sin evidencia, saldo
 * global y sobregiro sin permiso solo avisan. Las cuentas sin saldo inicial no dan hallazgo (pueden ser nuevas).
 */
export function hallazgosDeCierre(cuentas: CuentaParaLaRevision[], permiteSobregiro: boolean): HallazgoDeCierre[] {
  return cuentas
    .filter((cuenta) => cuenta.forma !== 'sin_saldo')
    .flatMap((cuenta) => hallazgosDeLaCuenta(cuenta, permiteSobregiro));
}
