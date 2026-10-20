import { deCentavos } from '../../../core/compartido/dominio/centavos.js';

/** Una fila cuyas columnas de dinero (en centavos) viajan como texto con dos decimales. */
export type ConDineroEnTexto<Fila, Claves extends keyof Fila> = {
  [Clave in keyof Fila]: Clave extends Claves ? string : Fila[Clave];
};

/** Pasa las columnas de dinero indicadas de centavos a texto; las demás quedan igual. */
export function dineroEnTexto<Fila extends object, Clave extends keyof Fila>(
  fila: Fila,
  claves: readonly Clave[],
): ConDineroEnTexto<Fila, Clave> {
  const resultado = { ...fila } as Record<string, unknown>;
  for (const clave of claves) resultado[clave as string] = deCentavos(fila[clave] as number);
  return resultado as ConDineroEnTexto<Fila, Clave>;
}

/** El rango de períodos con que se pidió un análisis, que encabeza toda respuesta. */
export interface RangoDto {
  desde: string;
  hasta: string;
}

/** Excel recibe el dinero como número; los centavos son enteros, así que no hay error de suma. */
export const quetzales = (centavos: number): number => centavos / 100;
