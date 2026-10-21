import { deCentavos } from '../../core/compartido/dominio/centavos.js';

/** Centavos como quetzales para un mensaje: `120000` → `Q1,200.00`. */
function quetzales(centavos: number): string {
  const [enteros = '0', decimales = '00'] = deCentavos(centavos).split('.');
  return `Q${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
}

/**
 * Lo que se le dice a quien registra una nota de crédito que deja saldo libre: la retención ya se practicó, así que el
 * proveedor le debe esa parte a la empresa y se compensa en la próxima factura o se le pide en reintegro (U13).
 */
export function avisoDeSaldoALaFavor(saldoLibreCentavos: number): string {
  return `Esta nota deja ${quetzales(saldoLibreCentavos)} a favor de la empresa porque la retención ya se practicó. Compénselo en la próxima factura o pida el reintegro al proveedor.`;
}
