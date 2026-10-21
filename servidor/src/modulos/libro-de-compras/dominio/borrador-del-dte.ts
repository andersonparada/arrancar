import type { BorradorDelDte, DatosDelDte } from './dte-recibido.js';
import { BorradorDeDteInvalido, FacturaSoloEnNotas } from './errores-de-bandeja.js';
import { primerDiaDelMes } from './periodo-del-libro.js';
import { esNota, FAMILIA_DEL_TIPO_DTE } from './tipos-de-documento.js';

/** Los cambios al borrador de una fila: lo que no viene no se toca y `null` lo deja sin completar. */
export type CambiosAlBorrador = Partial<BorradorDelDte>;

/** Quita las claves sin valor (`undefined`) para que no borren lo ya completado. */
export function cambiosDefinidos(cambios: CambiosAlBorrador): CambiosAlBorrador {
  return Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined));
}

/**
 * Revisa los cambios contra el DTE: la recepción no puede ser anterior a la emisión, el período es un primer día de mes que
 * no cae antes del mes de la emisión, y solo una nota lleva factura afectada (las mismas reglas de las llaves de la base).
 * @throws BorradorDeDteInvalido o FacturaSoloEnNotas.
 */
export function exigirBorradorValido(
  dte: Pick<DatosDelDte, 'fechaEmision' | 'tipoDte'>,
  cambios: CambiosAlBorrador,
): void {
  const { fechaRecepcion, periodo, documentoAfectadoId } = cambios;
  if (fechaRecepcion && fechaRecepcion < dte.fechaEmision) {
    throw new BorradorDeDteInvalido('La fecha de recepción no puede ser anterior a la fecha de emisión.');
  }
  if (periodo && (periodo !== primerDiaDelMes(periodo) || periodo < primerDiaDelMes(dte.fechaEmision))) {
    throw new BorradorDeDteInvalido(
      'El período debe ser el primer día de un mes que no sea anterior al de la emisión.',
    );
  }
  if (documentoAfectadoId && !esNota(FAMILIA_DEL_TIPO_DTE[dte.tipoDte])) throw new FacturaSoloEnNotas();
}
