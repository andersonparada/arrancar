import { aCentavos, deCentavos } from '../comunes/centavos';

export type ResultadoDeComparacion =
  { estado: 'sin_saldo' } | { estado: 'coincide' } | { estado: 'difiere'; diferencia: string };

/** Lo que `faltaParaTerminar` necesita saber; el paso del archivo adjunto agrega aquí su exigencia. */
export interface DatosParaTerminar {
  saldoEstadoDeCuenta: string | null;
  saldoQueDebeMostrarElEstadoDeCuenta: string;
}

/**
 * Pasa lo que escribió el usuario (por ejemplo `1,250.5`) a texto con el formato de la API (`1250.5`), o `null` si
 * está vacío o no es un importe válido de hasta 2 decimales.
 */
export function normalizarMonto(texto: string): string | null {
  const limpio = texto.replace(/[\s,Q]/gi, '');
  return /^-?\d+(\.\d{1,2})?$/.test(limpio) ? limpio : null;
}

/** Compara en centavos el saldo escrito con el calculado; la diferencia es calculado menos transcrito. */
export function compararSaldo(escrito: string | null, calculado: string): ResultadoDeComparacion {
  const monto = escrito === null ? null : normalizarMonto(escrito);
  if (monto === null) return { estado: 'sin_saldo' };
  const diferencia = aCentavos(calculado) - aCentavos(monto);
  return diferencia === 0 ? { estado: 'coincide' } : { estado: 'difiere', diferencia: deCentavos(diferencia) };
}

/** Los motivos por los que aún no se puede terminar la conciliación; vacío si ya se puede. */
export function faltaParaTerminar(datos: DatosParaTerminar): string[] {
  const resultado = compararSaldo(datos.saldoEstadoDeCuenta, datos.saldoQueDebeMostrarElEstadoDeCuenta);
  if (resultado.estado === 'sin_saldo') return ['Escriba el saldo final que muestra el estado de cuenta.'];
  if (resultado.estado === 'difiere') {
    return [
      'El saldo del estado de cuenta no coincide con el calculado: revise las marcas o registre la nota que falte.',
    ];
  }
  return [];
}
