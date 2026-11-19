/** Cómo se agrupan los anticipos por liquidar según los días que pasaron de su fecha límite (CL-R1). */
export type TramoDeAntiguedad = 'al_dia' | 'de_1_a_30' | 'de_31_a_60' | 'de_61_a_90' | 'mas_de_90';

export const TRAMOS_DE_ANTIGUEDAD: ReadonlyArray<{ clave: TramoDeAntiguedad; titulo: string }> = [
  { clave: 'al_dia', titulo: 'Dentro del plazo' },
  { clave: 'de_1_a_30', titulo: 'Vencido de 1 a 30 días' },
  { clave: 'de_31_a_60', titulo: 'Vencido de 31 a 60 días' },
  { clave: 'de_61_a_90', titulo: 'Vencido de 61 a 90 días' },
  { clave: 'mas_de_90', titulo: 'Vencido más de 90 días' },
];

/** El tramo de un anticipo por los días vencidos (0 o menos: sigue dentro del plazo). */
export function tramoDeAntiguedad(diasVencido: number): TramoDeAntiguedad {
  if (diasVencido <= 0) return 'al_dia';
  if (diasVencido <= 30) return 'de_1_a_30';
  if (diasVencido <= 60) return 'de_31_a_60';
  return diasVencido <= 90 ? 'de_61_a_90' : 'mas_de_90';
}

/** Los títulos de cada destino de lo no liquidado (CL-R2). */
export const TITULOS_DE_DESTINO: Readonly<Record<'cobrar' | 'renta_del_trabajo' | 'perdida', string>> = {
  cobrar: 'Por cobrar al beneficiario (en cuotas)',
  renta_del_trabajo: 'Renta del trabajo (empleados)',
  perdida: 'Pérdida de la empresa',
};

/**
 * El valor de una cuota al cobrar lo no liquidado en `cuotas` pagos iguales, en centavos y redondeado hacia abajo: la
 * última cuota lleva lo que sobre.
 */
export const valorDeCuotaEnCentavos = (totalCentavos: number, cuotas: number): number =>
  Math.floor(totalCentavos / cuotas);
