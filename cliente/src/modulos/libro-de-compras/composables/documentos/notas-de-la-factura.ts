import type { NotaDeFactura } from '../../servicios/documentos.api';

/** Un grupo de la ficha: el título con su cantidad y las notas de ese tipo. */
export interface GrupoDeNotas {
  titulo: string;
  notas: NotaDeFactura[];
}

/** Una nota sin `tipo` (el servidor aún no lo envía) cuenta como nota de crédito, como hasta ahora. */
const esDeDebito = (nota: NotaDeFactura): boolean => nota.tipo === 'nota_de_debito';

/**
 * Las notas de una factura agrupadas en la ficha: primero las de crédito y luego las de débito, solo los grupos que
 * tienen alguna. Cada título lleva la cantidad, como «Notas de débito (2)».
 */
export function gruposDeNotas(notas: NotaDeFactura[]): GrupoDeNotas[] {
  const debito = notas.filter(esDeDebito);
  const credito = notas.filter((nota) => !esDeDebito(nota));
  const grupos: GrupoDeNotas[] = [
    { titulo: `Notas de crédito (${credito.length})`, notas: credito },
    { titulo: `Notas de débito (${debito.length})`, notas: debito },
  ];
  return grupos.filter((grupo) => grupo.notas.length > 0);
}

/**
 * Cómo nombrar las notas en un texto: «notas de crédito», «notas de débito» o ambas. Sin notas, de crédito, como la
 * explicación de siempre.
 */
export function nombreDeLasNotas(notas: NotaDeFactura[]): string {
  const hayDebito = notas.some(esDeDebito);
  const hayCredito = notas.some((nota) => !esDeDebito(nota));
  if (hayDebito && hayCredito) return 'notas de crédito o de débito';
  return hayDebito ? 'notas de débito' : 'notas de crédito';
}
