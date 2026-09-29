import type { Correlativos } from '../../core/compartido/aplicacion/correlativos.js';
import type { Movimiento } from '../dominio/movimiento.js';

/** Claves de `core.correlativos` de los comprobantes de Bancos. */
export const CLAVE_DE_NOTAS_DE_CREDITO = 'bancos.notas_de_credito';
export const CLAVE_DE_NOTAS_DE_DEBITO = 'bancos.notas_de_debito';
export const CLAVE_DE_TRANSFERENCIAS = 'bancos.transferencias';

/** Nombre de cada correlativo para mostrarlo; sus claves son las únicas que numeran comprobantes de Bancos. */
export const NOMBRES_DE_CORRELATIVOS: Record<string, string> = {
  [CLAVE_DE_NOTAS_DE_CREDITO]: 'Notas de crédito',
  [CLAVE_DE_NOTAS_DE_DEBITO]: 'Notas de débito',
  [CLAVE_DE_TRANSFERENCIAS]: 'Transferencias',
};

/** Cada tipo de nota lleva su propio correlativo. */
export function claveDeNotas(tipo: 'credito' | 'debito' | 'cheque'): string {
  return tipo === 'credito' ? CLAVE_DE_NOTAS_DE_CREDITO : CLAVE_DE_NOTAS_DE_DEBITO;
}

/**
 * Le da su número correlativo al movimiento si le corresponde (notas sueltas y sus inversos);
 * los cheques, el saldo inicial y las notas de una transferencia quedan sin número. Se llama
 * dentro de la unidad de trabajo, cuando ya pasaron las validaciones.
 */
export async function numerarSiCorresponde(correlativos: Correlativos, movimiento: Movimiento): Promise<void> {
  if (!movimiento.llevaNumero) return;
  const { tipo, fecha } = movimiento.instantanea();
  movimiento.numerar(await correlativos.siguiente(claveDeNotas(tipo), fecha));
}
