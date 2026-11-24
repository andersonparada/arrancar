import type { FormaDePago } from './pagos.js';

/** Las formas de pago con el nombre que ve quien lee (el mismo de las pantallas). */
export const NOMBRES_DE_FORMAS: Record<FormaDePago, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_ligada: 'Nota de débito ligada',
  cuenta_de_apertura: 'Cuenta de apertura',
  efectivo: 'Efectivo',
  cheque_de_apertura: 'Cheque de apertura',
};
